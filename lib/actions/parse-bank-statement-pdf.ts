'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import type { ImportTransaction } from './import-statement'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type ParseBankPdfResult =
  | {
      success: true
      bank: string
      period_start: string
      period_end: string
      transactions: ImportTransaction[]
    }
  | { success: false; error: string }

// ── Prompt ─────────────────────────────────────────────────────────────────────

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

// ── Server action ──────────────────────────────────────────────────────────────

export async function parseBankStatementPdf(
  pdfBase64: string,
  mimeType: string = 'application/pdf',
): Promise<ParseBankPdfResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: 'GEMINI_API_KEY não configurada. Adicione ao .env.local.',
    }
  }

  // Verifica autenticação
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
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
    const jsonStr = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

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

    // Normaliza e valida cada transação
    const SAFE_CATEGORIES = new Set([
      'mercado', 'alimentacao', 'compras', 'transporte', 'combustivel',
      'veiculo', 'assinaturas', 'saude', 'educacao', 'lazer',
      'moradia', 'fatura_cartao', 'outros',
    ])
    const SAFE_PAYMENT_METHODS = new Set([
      'credito', 'debito', 'especie', 'credito_parcelado', 'pix', 'ted', 'doc',
    ])

    const today = new Date().toISOString().slice(0, 10)

    const transactions: ImportTransaction[] = parsed.transactions
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

    if (transactions.length === 0) {
      return { success: false, error: 'Nenhuma transação válida encontrada no extrato.' }
    }

    // Calcula período a partir das datas das transações se não vier do Gemini
    const dates = transactions.map((t) => t.date).sort()
    const period_start = parsed.period_start || dates[0]
    const period_end = parsed.period_end || dates[dates.length - 1]

    return {
      success: true,
      bank: parsed.bank || 'Desconhecido',
      period_start,
      period_end,
      transactions,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return { success: false, error: `Erro ao chamar Gemini: ${msg}` }
  }
}
