'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { calculateInstallmentDates, addMonths } from '@/lib/installments'

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
  | { success: true; data: ParsedCardStatement }
  | { success: false; error: string }

export type ConfirmStatementInput = {
  card_id: string | null          // null = criar novo cartão
  card_name: string
  credit_limit: number | null
  closing_day: number | null
  due_day: number | null
  transactions: (ParsedTransaction & { selected: boolean })[]
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
- Inclua TODAS as transações da fatura, inclusive estornos (amount negativo para estornos)
- Para compras parceladas como "LOJA ABC 02/06", installment_current=2, installment_total=6
- Para compras à vista, installment_current=null, installment_total=null
- Ignore taxas/encargos/juros (não são compras)
- O campo amount deve ser o valor de UMA parcela (não o total parcelado)
- Retorne SOMENTE o JSON, sem explicações
`

// ── Server action: parsear fatura ─────────────────────────────────────────────

export async function parseCardStatement(
  pdfBase64: string,
  mimeType: string = 'application/pdf',
): Promise<ParseStatementResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'GEMINI_API_KEY não configurada. Adicione ao .env.local.' }
  }

  // Verifica autenticação
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { success: false, error: 'Usuário não autenticado.' }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      {
        inlineData: {
          mimeType,
          data: pdfBase64,
        },
      },
    ])

    const text = result.response.text().trim()

    // Remove markdown code fences se presentes
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let parsed: ParsedCardStatement
    try {
      parsed = JSON.parse(jsonStr) as ParsedCardStatement
    } catch {
      return { success: false, error: `Gemini retornou formato inválido. Tente novamente.\n\nResposta: ${text.slice(0, 200)}` }
    }

    // Validação básica
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      return { success: false, error: 'Não foi possível extrair transações da fatura.' }
    }

    // Normaliza datas e valores
    parsed.transactions = parsed.transactions
      .filter((t) => t.description && t.amount !== undefined)
      .map((t) => ({
        ...t,
        amount: Math.abs(Number(t.amount) || 0),
        date: t.date || parsed.invoice_month + '-01',
      }))

    return { success: true, data: parsed }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return { success: false, error: `Erro ao chamar Gemini: ${msg}` }
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

  // 1. Criar ou atualizar cartão
  let cardId = input.card_id

  if (!cardId) {
    // Criar novo cartão
    const { data: newCard, error: cardErr } = await supabase
      .from('credit_cards')
      .insert({
        user_id: user.id,
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
    }
  }

  // 2. Importar transações selecionadas
  const selected = input.transactions.filter((t) => t.selected && t.amount > 0)
  const rows: object[] = []
  let projected = 0

  for (const t of selected) {
    const isParcelado = t.installment_total && t.installment_total > 1
    const n = isParcelado ? t.installment_total! : 1
    const current = isParcelado ? t.installment_current ?? 1 : 1
    const remaining = n - current + 1 // parcelas restantes incluindo a atual

    if (isParcelado && remaining > 1 && input.closing_day && input.due_day) {
      // Calcula datas das parcelas restantes a partir da data da compra
      const futureDates = calculateInstallmentDates(
        t.date,
        input.closing_day,
        input.due_day,
        remaining,
      )

      for (let i = 0; i < remaining; i++) {
        const installNum = current + i
        rows.push({
          user_id: user.id,
          credit_card_id: cardId,
          amount: t.amount,
          description: `${t.description} (${installNum}/${n})`,
          category: safeCategory(t.category_hint),
          payment_method: 'credito_parcelado',
          installments: n,
          installment_number: installNum,
          due_date: futureDates[i] ?? addMonths(t.date, i),
          paid: i === 0 ? false : false, // não marcamos como pago automaticamente
        })
        if (i > 0) projected++
      }
    } else {
      // À vista ou parcela única
      rows.push({
        user_id: user.id,
        credit_card_id: cardId,
        amount: t.amount,
        description: isParcelado ? `${t.description} (${current}/${n})` : t.description,
        category: safeCategory(t.category_hint),
        payment_method: isParcelado ? 'credito_parcelado' : 'credito',
        installments: isParcelado ? n : null,
        installment_number: isParcelado ? current : null,
        due_date: t.date,
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
