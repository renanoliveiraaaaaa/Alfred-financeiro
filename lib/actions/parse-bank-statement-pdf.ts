'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import type { ImportTransaction } from './import-statement'
import { extractPdfPlainText } from '@/lib/parsers/extractPdfText'
import {
  guessBankFromPdfText,
  parseBankTransactionsFromPdfText,
  MIN_LOCAL_BANK_TX,
} from '@/lib/parsers/bankPdfHeuristics'

export type ParseBankPdfResult =
  | {
      success: true
      bank: string
      period_start: string
      period_end: string
      transactions: ImportTransaction[]
      /** local = texto + regras (rápido); gemini = API */
      parse_source: 'local' | 'gemini'
    }
  | { success: false; error: string }

const EXTRACTION_PROMPT = `
Você é um extrator de dados financeiros especializado em extratos bancários brasileiros.

Analise o PDF deste extrato bancário e retorne APENAS um objeto JSON válido (sem markdown, sem texto extra) com a seguinte estrutura:

{
  "bank": "nome do banco (ex: Itaú, Nubank, Bradesco, C6, Inter, Santander, BB, Caixa)",
  "period_start": "data de início do extrato no formato YYYY-MM-DD",
  "period_end": "data de fim do extrato no formato YYYY-MM-DD",
  "transactions": [
    {
      "date": "data da transação no formato YYYY-MM-DD",
      "description": "descrição exata como aparece no extrato",
      "amount": valor em número positivo (ex: 150.00),
      "type": "revenue" se é entrada/crédito na conta, "expense" se é saída/débito,
      "category": categoria em português: mercado, alimentacao, compras, transporte, combustivel, veiculo, assinaturas, saude, educacao, lazer, moradia, fatura_cartao, outros,
      "payment_method": "pix", "debito", "ted", "doc", "especie" ou "outros"
    }
  ]
}

REGRAS IMPORTANTES:
- "type": "revenue" → dinheiro ENTRANDO na conta (salário, PIX recebido, transferência recebida, rendimento)
- "type": "expense" → dinheiro SAINDO da conta (pagamento de fatura, PIX enviado, compra no débito, saque, tarifa)
- Pagamento de fatura de cartão → type: "expense", category: "fatura_cartao"
- PIX recebido → type: "revenue"
- PIX enviado/pago → type: "expense"
- Tarifas bancárias → type: "expense", category: "outros"
- Saldo inicial/final NÃO é uma transação — ignore
- amount SEMPRE positivo, o "type" indica direção
- Se não souber a categoria, use "outros"
- payment_method: use "pix" para transações PIX, "debito" para débito em conta, "ted" para TED, "especie" para saque/dinheiro
- Retorne SOMENTE o JSON, sem explicações adicionais
`

const SAFE_CATEGORIES = new Set([
  'mercado', 'alimentacao', 'compras', 'transporte', 'combustivel',
  'veiculo', 'assinaturas', 'saude', 'educacao', 'lazer',
  'moradia', 'fatura_cartao', 'outros',
])
const SAFE_PAYMENT_METHODS = new Set([
  'credito', 'debito', 'especie', 'credito_parcelado', 'pix', 'ted', 'doc',
])

function normalizeTransactions(raw: ImportTransaction[]): ImportTransaction[] {
  const today = new Date().toISOString().slice(0, 10)
  return raw
    .filter((t) => t.description && t.amount !== undefined && (t.type === 'revenue' || t.type === 'expense'))
    .map((t) => ({
      date: t.date || today,
      description: String(t.description).trim(),
      amount: Math.abs(Number(t.amount) || 0),
      type: t.type as 'revenue' | 'expense',
      category: SAFE_CATEGORIES.has(String(t.category)) ? String(t.category) : 'outros',
      payment_method: SAFE_PAYMENT_METHODS.has(String(t.payment_method))
        ? String(t.payment_method)
        : 'debito',
    }))
    .filter((t) => t.amount > 0)
}

async function parseWithGemini(
  pdfBase64: string,
  mimeType: string,
  apiKey: string,
): Promise<ParseBankPdfResult> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    { inlineData: { mimeType, data: pdfBase64 } },
  ])

  const text = result.response.text().trim()
  const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let parsed: {
    bank: string
    period_start: string
    period_end: string
    transactions: ImportTransaction[]
  }

  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    return {
      success: false,
      error: `Gemini retornou formato inválido. Tente novamente.\n\nResposta: ${text.slice(0, 300)}`,
    }
  }

  if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
    return { success: false, error: 'Não foi possível extrair transações do extrato.' }
  }

  const transactions = normalizeTransactions(parsed.transactions)
  if (transactions.length === 0) {
    return { success: false, error: 'Nenhuma transação válida encontrada no extrato.' }
  }

  const dates = transactions.map((t) => t.date).sort()
  return {
    success: true,
    bank: parsed.bank || 'Desconhecido',
    period_start: parsed.period_start || dates[0],
    period_end: parsed.period_end || dates[dates.length - 1],
    transactions,
    parse_source: 'gemini',
  }
}

const MIN_TEXT_LEN = 120
/** Extratos longos: tentativa local só nas primeiras páginas; Gemini usa o PDF inteiro sem re-parse. */
const LOCAL_BANK_MAX_PAGES = 48

export async function parseBankStatementPdf(
  pdfBase64: string,
  mimeType: string = 'application/pdf',
): Promise<ParseBankPdfResult> {
  try {
    return await parseBankStatementPdfImpl(pdfBase64, mimeType)
  } catch (err: unknown) {
    console.error('[parseBankStatementPdf]', err)
    return {
      success: false,
      error:
        'Não foi possível processar este PDF no servidor. Confirme GEMINI_API_KEY na Vercel ou use OFX/CSV.',
    }
  }
}

async function parseBankStatementPdfImpl(
  pdfBase64: string,
  mimeType: string,
): Promise<ParseBankPdfResult> {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { success: false, error: 'Usuário não autenticado.' }

  let buffer: Buffer
  try {
    buffer = Buffer.from(pdfBase64, 'base64')
  } catch {
    return { success: false, error: 'Ficheiro inválido. Envie um PDF.' }
  }
  let plainText = ''
  try {
    plainText = await extractPdfPlainText(buffer, { maxPages: LOCAL_BANK_MAX_PAGES })
  } catch {
    plainText = ''
  }

  if (plainText.length >= MIN_TEXT_LEN) {
    const localRaw = parseBankTransactionsFromPdfText(plainText)
    if (localRaw.length >= MIN_LOCAL_BANK_TX) {
      const transactions = normalizeTransactions(localRaw)
      if (transactions.length >= MIN_LOCAL_BANK_TX) {
        const dates = transactions.map((t) => t.date).sort()
        return {
          success: true,
          bank: guessBankFromPdfText(plainText),
          period_start: dates[0],
          period_end: dates[dates.length - 1],
          transactions,
          parse_source: 'local',
        }
      }
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (apiKey) {
    try {
      return await parseWithGemini(pdfBase64, mimeType, apiKey)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      return { success: false, error: `Erro ao chamar Gemini: ${msg}` }
    }
  }

  let fullText = plainText
  try {
    fullText = await extractPdfPlainText(buffer)
  } catch {
    fullText = plainText
  }
  if (fullText.length >= MIN_TEXT_LEN) {
    const localRaw = parseBankTransactionsFromPdfText(fullText)
    if (localRaw.length >= MIN_LOCAL_BANK_TX) {
      const transactions = normalizeTransactions(localRaw)
      if (transactions.length >= MIN_LOCAL_BANK_TX) {
        const dates = transactions.map((t) => t.date).sort()
        return {
          success: true,
          bank: guessBankFromPdfText(fullText),
          period_start: dates[0],
          period_end: dates[dates.length - 1],
          transactions,
          parse_source: 'local',
        }
      }
    }
  }

  return {
    success: false,
    error:
      fullText.length < MIN_TEXT_LEN
        ? 'Este PDF parece ser só imagem (sem texto) ou está protegido. Exporte OFX/CSV no banco ou configure GEMINI_API_KEY para usar IA.'
        : 'Não foi possível interpretar o layout deste PDF automaticamente. Use arquivo OFX/CSV ou configure GEMINI_API_KEY para análise por IA.',
  }
}
