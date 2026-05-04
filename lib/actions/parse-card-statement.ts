'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { resolveActiveOrganizationId } from '@/lib/activeOrganizationServer'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { calculateInstallmentDates, addMonths } from '@/lib/installments'
import { extractPdfPlainText } from '@/lib/parsers/extractPdfText'
import { parseCardInvoiceFromPdfText } from '@/lib/parsers/cardInvoicePdfHeuristics'
import { formatGeminiCallError, getGeminiApiKey, getGeminiModelId } from '@/lib/geminiEnv'
import { parseGeminiJsonResponse } from '@/lib/parseGeminiJson'
import { extractPlainTextFromEgidePdf } from '@/lib/egideClient'
import { isEgideConfigured } from '@/lib/egideEnv'

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type ParsedTransaction = {
  date: string            // YYYY-MM-DD
  description: string
  amount: number          // valor de UMA parcela
  installment_current: number | null
  installment_total: number | null
  category_hint: string | null
}

export type ParsedCardStatement = {
  card_name: string
  last_four: string | null
  credit_limit: number | null
  available_limit: number | null
  closing_day: number | null
  due_day: number | null
  invoice_month: string   // YYYY-MM
  invoice_total: number
  transactions: ParsedTransaction[]
}

export type ParseStatementResult =
  | { success: true; data: ParsedCardStatement; parse_source: 'local' | 'gemini' | 'egide' }
  | { success: false; error: string }

/** Opções opcionais da server action (texto já extraído no cliente com pdf.js). */
export type ParseCardStatementOptions = {
  clientText?: string
}

export type ConfirmStatementInput = {
  card_id: string | null          // null = criar novo cartão
  card_name: string
  credit_limit: number | null
  closing_day: number | null
  due_day: number | null
  /** YYYY-MM da fatura do PDF — obrigatório para alinhar vencimentos ao mês da fatura */
  invoice_month: string | null
  transactions: (ParsedTransaction & { selected: boolean })[]
}

/** Vencimento típico: dia `dueDay` dentro do mês de competência da fatura (YYYY-MM). */
function statementDueDateISO(invoiceMonth: string, dueDay: number): string | null {
  const m = invoiceMonth.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  if (mo < 1 || mo > 12) return null
  const last = new Date(y, mo, 0).getDate()
  const d = Math.min(Math.max(1, dueDay), last)
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export type ConfirmStatementResult =
  | { success: true; created_card_id: string; imported: number; projected: number }
  | { success: false; error: string }

// ── Prompt para o Gemini ──────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `
Você é um extrator de dados financeiros especializado em faturas de cartão de crédito brasileiras.

Analise o PDF desta fatura e retorne APENAS um objeto JSON válido (sem markdown, sem texto extra) com a seguinte estrutura:

{
  "card_name": "Nome do banco e cartão (ex: Nubank Mastercard, Itaú Visa Platinum)",
  "last_four": "últimos 4 dígitos do cartão ou null",
  "credit_limit": limite total em número (ex: 5000.00) ou null,
  "available_limit": limite disponível em número ou null,
  "closing_day": dia de fechamento em número (ex: 3) ou null,
  "due_day": dia de vencimento em número (ex: 10) ou null,
  "invoice_month": "mês da fatura no formato YYYY-MM (ex: 2026-04)",
  "invoice_total": total da fatura em número,
  "transactions": [
    {
      "date": "data da compra no formato YYYY-MM-DD",
      "description": "descrição da compra como aparece na fatura",
      "amount": valor em número (apenas o valor de UMA parcela, positivo),
      "installment_current": número da parcela atual (ex: 2) ou null se não for parcelado,
      "installment_total": total de parcelas (ex: 6) ou null se não for parcelado,
      "category_hint": categoria sugerida em português (mercado, alimentacao, transporte, combustivel, assinaturas, saude, educacao, lazer, moradia, compras, veiculo, outros) ou null
    }
  ]
}

IMPORTANTE:
- Liste TODAS as linhas de compras do demonstrativo: parceladas E à vista (pagamento único). Compras à vista são obrigatórias — costumam ser a maior parte do total da fatura; NÃO as omita.
- Para compras parceladas (ex.: "LOJA ABC 02/06" ou "02/06" no fim), installment_current=2, installment_total=6; amount = valor DE UMA PARCELA só.
- Para compras à vista (sem indicação de parcelas), installment_current=null, installment_total=null; amount = valor integral daquela linha.
- Inclua estornos como transações com amount negativo.
- Ignore APENAS linhas que sejam claramente IOF, juros rotativos, multa, anuidade ou "total da fatura" agregado — não confundir com compras à vista.
- invoice_total no JSON deve ser o total da fatura impresso no PDF; a soma dos amounts positivos (parcelas + à vista, sem estornos) deve ficar próxima desse total — se faltar muito, reveja se esqueceu compras à vista ou linhas sem "parcela" no texto.
- Retorne SOMENTE o JSON, sem explicações
`

// ── Server action: parsear fatura ─────────────────────────────────────────────

const MIN_TEXT_LEN = 120
/** Primeiras páginas bastam para a maioria das faturas; evita parse pesado do PDF inteiro. */
const LOCAL_CARD_MAX_PAGES = 32

function safeParseCardLocal(text: string): ParsedCardStatement | null {
  try {
    return parseCardInvoiceFromPdfText(text)
  } catch {
    return null
  }
}

export async function parseCardStatement(
  pdfBase64: string,
  mimeType: string = 'application/pdf',
  options?: ParseCardStatementOptions,
): Promise<ParseStatementResult> {
  try {
    return await parseCardStatementImpl(pdfBase64, mimeType, options)
  } catch (err: unknown) {
    console.error('[parseCardStatement]', err)
    return {
      success: false,
      error:
        'Não foi possível processar este PDF no servidor. Confirme GEMINI_API_KEY na Vercel, tente outro ficheiro ou cadastre as compras manualmente.',
    }
  }
}

async function parseCardStatementImpl(
  pdfBase64: string,
  mimeType: string,
  options?: ParseCardStatementOptions,
): Promise<ParseStatementResult> {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { success: false, error: 'Usuário não autenticado.' }

  let buffer: Buffer
  try {
    buffer = Buffer.from(pdfBase64, 'base64')
  } catch {
    return { success: false, error: 'Ficheiro inválido. Envie um PDF.' }
  }

  const pre = options?.clientText?.trim() ?? ''
  if (pre.length >= MIN_TEXT_LEN) {
    const fromClient = safeParseCardLocal(pre)
    if (fromClient && fromClient.transactions.length > 0) {
      return { success: true, data: fromClient, parse_source: 'local' }
    }
  }

  let plainText = await extractPdfPlainText(buffer, { maxPages: LOCAL_CARD_MAX_PAGES })

  if (plainText.length >= MIN_TEXT_LEN) {
    const local = safeParseCardLocal(plainText)
    if (local && local.transactions.length > 0) {
      return { success: true, data: local, parse_source: 'local' }
    }
  }

  if (isEgideConfigured()) {
    const egideText = await extractPlainTextFromEgidePdf(buffer)
    if (egideText && egideText.length >= MIN_TEXT_LEN) {
      const fromEgide = safeParseCardLocal(egideText)
      if (fromEgide && fromEgide.transactions.length > 0) {
        return { success: true, data: fromEgide, parse_source: 'egide' }
      }
    }
  }

  const apiKey = getGeminiApiKey()
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: getGeminiModelId(),
        generationConfig: {
          temperature: 0.1,
          /** Faturas com muitas linhas; 8k cortava o JSON a meio. */
          maxOutputTokens: 32768,
          /** Evita ```json fences e reduz tokens desperdiçados. */
          responseMimeType: 'application/json',
        },
      })

      const result = await model.generateContent([
        EXTRACTION_PROMPT,
        { inlineData: { mimeType, data: pdfBase64 } },
      ])

      const text = result.response.text().trim()
      const jsonResult = parseGeminiJsonResponse<ParsedCardStatement>(text)
      if (!jsonResult.ok) {
        return {
          success: false,
          error:
            `${jsonResult.hint}${jsonResult.truncated ? '' : `\n\nTrecho: ${text.slice(0, 280)}`}`,
        }
      }
      const parsed = jsonResult.data

      if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
        return { success: false, error: 'Não foi possível extrair transações da fatura.' }
      }

      const fallbackDate =
        parsed.invoice_month && /^\d{4}-\d{2}$/.test(parsed.invoice_month)
          ? `${parsed.invoice_month}-01`
          : new Date().toISOString().slice(0, 10)

      parsed.transactions = parsed.transactions
        .filter((t) => t.description && t.amount !== undefined)
        .map((t) => ({
          ...t,
          amount: Math.abs(Number(t.amount) || 0),
          date: t.date || fallbackDate,
        }))

      return { success: true, data: parsed, parse_source: 'gemini' }
    } catch (err: unknown) {
      return { success: false, error: formatGeminiCallError(err) }
    }
  }

  let fullText = plainText
  fullText = await extractPdfPlainText(buffer)
  if (fullText.length >= MIN_TEXT_LEN) {
    const localFull = safeParseCardLocal(fullText)
    if (localFull && localFull.transactions.length > 0) {
      return { success: true, data: localFull, parse_source: 'local' }
    }
  }

  const noKeyHint =
    'Este PDF não tem texto selecionável (muito comum em faturas escaneadas). ' +
    'Para ler com IA: em aistudio.google.com crie uma API key; na Vercel (Settings → Environment Variables) adicione GEMINI_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY para Production e faça Redeploy. ' +
    'Em desenvolvimento use .env.local. Alternativa: cadastre os lançamentos manualmente.'

  const layoutHint =
    'Há texto no PDF mas o layout não foi reconhecido. Com GEMINI_API_KEY na Vercel (+ Redeploy) a IA costuma resolver; ou cadastre manualmente.'

  return {
    success: false,
    error: fullText.length < MIN_TEXT_LEN ? noKeyHint : layoutHint,
  }
}

// ── Server action: confirmar importação ──────────────────────────────────────

const SAFE_CATEGORIES = new Set([
  'mercado', 'alimentacao', 'compras', 'transporte', 'combustivel',
  'veiculo', 'assinaturas', 'saude', 'educacao', 'lazer', 'moradia',
  'fatura_cartao', 'outros',
])

function safeCategory(hint: string | null): string {
  if (!hint) return 'outros'
  const normalized = hint.toLowerCase().trim()
  return SAFE_CATEGORIES.has(normalized) ? normalized : 'outros'
}

export async function confirmCardStatement(
  input: ConfirmStatementInput,
): Promise<ConfirmStatementResult> {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { success: false, error: 'Usuário não autenticado.' }

  const orgRes = await resolveActiveOrganizationId()
  if (!orgRes.ok) return { success: false, error: orgRes.error }
  const organizationId = orgRes.organizationId

  // 1. Criar ou atualizar cartão
  let cardId = input.card_id

  if (!cardId) {
    // Criar novo cartão
    const { data: newCard, error: cardErr } = await supabase
      .from('credit_cards')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        name: input.card_name,
        credit_limit: input.credit_limit ?? 0,
        closing_day: input.closing_day ?? 1,
        due_day: input.due_day ?? 10,
        brand: null,
        color: 'slate',
      })
      .select('id')
      .single()

    if (cardErr || !newCard) {
      return { success: false, error: `Erro ao criar cartão: ${cardErr?.message}` }
    }
    cardId = newCard.id
  } else {
    // Atualizar limite se informado
    if (input.credit_limit) {
      await supabase
        .from('credit_cards')
        .update({ credit_limit: input.credit_limit })
        .eq('id', cardId)
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
    }
  }

  if (!cardId) {
    return { success: false, error: 'Não foi possível obter o cartão para importação.' }
  }

  // 2. Importar transações selecionadas
  const selected = input.transactions.filter((t) => t.selected && t.amount > 0)
  const rows: object[] = []
  let projected = 0

  const closingEff =
    input.closing_day != null && input.closing_day >= 1 && input.closing_day <= 31
      ? input.closing_day
      : 1
  const dueEff =
    input.due_day != null && input.due_day >= 1 && input.due_day <= 31 ? input.due_day : 10

  const statementDue =
    input.invoice_month && dueEff
      ? statementDueDateISO(input.invoice_month, dueEff)
      : null

  for (const t of selected) {
    const isParcelado = t.installment_total != null && t.installment_total > 1
    const n = isParcelado ? t.installment_total! : 1
    const current = isParcelado ? t.installment_current ?? 1 : 1
    const remaining = n - current + 1 // parcelas restantes incluindo a atual

    const dueThisInvoice = statementDue ?? t.date

    if (isParcelado && remaining > 1) {
      let futureDates = calculateInstallmentDates(t.date, closingEff, dueEff, n).slice(current - 1)
      /*
       * Se a data da compra no PDF não bate com o ciclo real, a 1ª parcela projetada cai
       * fora do mês da fatura e o total “some” do mês no dashboard. Ancoramos no vencimento
       * do mês da fatura (invoice_month + due_day) e seguimos mês a mês.
       */
      if (
        statementDue &&
        input.invoice_month &&
        futureDates.length > 0 &&
        !futureDates[0].startsWith(input.invoice_month)
      ) {
        futureDates = Array.from({ length: remaining }, (_, i) => addMonths(statementDue, i))
      }

      for (let i = 0; i < remaining; i++) {
        const installNum = current + i
        rows.push({
          user_id: user.id,
          organization_id: organizationId,
          credit_card_id: cardId,
          amount: t.amount,
          description: `${t.description} (${installNum}/${n})`,
          category: safeCategory(t.category_hint),
          payment_method: 'credito_parcelado',
          installments: n,
          installment_number: installNum,
          due_date: futureDates[i] ?? addMonths(dueThisInvoice, i),
          paid: false,
        })
        if (i > 0) projected++
      }
    } else {
      // À vista, última parcela, ou parcela única — competência = mês da fatura no vencimento
      rows.push({
        user_id: user.id,
        organization_id: organizationId,
        credit_card_id: cardId,
        amount: t.amount,
        description: isParcelado ? `${t.description} (${current}/${n})` : t.description,
        category: safeCategory(t.category_hint),
        payment_method: isParcelado ? 'credito_parcelado' : 'credito',
        installments: isParcelado ? n : null,
        installment_number: isParcelado ? current : null,
        due_date: dueThisInvoice,
        paid: false,
      })
    }
  }

  if (rows.length === 0) {
    return { success: false, error: 'Nenhuma transação selecionada.' }
  }

  const { error: insertErr } = await supabase.from('expenses').insert(rows)
  if (insertErr) {
    return { success: false, error: `Erro ao salvar despesas: ${insertErr.message}` }
  }

  return {
    success: true,
    created_card_id: cardId,
    imported: selected.length,
    projected,
  }
}
