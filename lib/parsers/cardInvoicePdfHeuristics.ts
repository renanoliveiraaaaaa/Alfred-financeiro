import type { ParsedCardStatement, ParsedTransaction } from '@/lib/actions/parse-card-statement'
import { guessBankFromPdfText, parseBrazilianMoney } from '@/lib/parsers/bankPdfHeuristics'

function parseDateBr(d: string, m: string, y: string): string | null {
  const day = parseInt(d, 10)
  const month = parseInt(m, 10)
  let year = parseInt(y, 10)
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null
  if (year < 100) year = year >= 70 ? 1900 + year : 2000 + year
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const SKIP =
  /^(total|subtotal|fatura|limite|pagamento\s+m[ií]nimo|juros|iof|anuidade|continua|pág)/i

function extractDay(label: string, text: string): number | null {
  const re = new RegExp(`${label}[^\\d]{0,20}(\\d{1,2})`, 'i')
  const m = text.slice(0, 12000).match(re)
  if (!m) return null
  const d = parseInt(m[1], 10)
  return d >= 1 && d <= 31 ? d : null
}

function guessCategory(desc: string): string | null {
  const u = desc.toLowerCase()
  if (/ifood|rappi|restaurante|lanche/i.test(u)) return 'alimentacao'
  if (/uber|99|posto|shell|ipiranga/i.test(u)) return /posto|shell|ipiranga/i.test(u) ? 'combustivel' : 'transporte'
  if (/mercado|amazon|shopee|magalu/i.test(u)) return /mercado|atacad/i.test(u) ? 'mercado' : 'compras'
  if (/netflix|spotify|disney/i.test(u)) return 'assinaturas'
  return 'outros'
}

/**
 * Heurística para fatura de cartão em PDF com texto selecionável.
 */
export function parseCardInvoiceFromPdfText(text: string): ParsedCardStatement | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const transactions: ParsedTransaction[] = []
  const seen = new Set<string>()

  const reLine =
    /^(\d{2})\/(\d{2})\/(\d{2,4})\s+(.+?)\s+(-?[\d]{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})\s*$/

  for (const line of lines) {
    if (line.length < 15 || SKIP.test(line)) continue
    const m = line.match(reLine)
    if (!m) continue

    const dateStr = parseDateBr(m[1], m[2], m[3])
    if (!dateStr) continue

    let rest = m[4].trim()
    const amountRaw = m[5]
    const signed = parseBrazilianMoney(amountRaw)
    if (signed === null) continue
    const amount = Math.abs(signed)
    if (amount < 0.01) continue

    let installment_current: number | null = null
    let installment_total: number | null = null
    const inst = rest.match(/\b(\d{1,2})\s*[/x]\s*(\d{1,2})\b\s*$/i)
    if (inst) {
      installment_current = parseInt(inst[1], 10)
      installment_total = parseInt(inst[2], 10)
      if (installment_current > 0 && installment_total > 0 && installment_current <= installment_total) {
        rest = rest.slice(0, rest.length - inst[0].length).trim()
      } else {
        installment_current = null
        installment_total = null
      }
    }

    const desc = rest.length >= 2 ? rest.slice(0, 400) : line
    const key = `${dateStr}|${desc.slice(0, 60)}|${amount.toFixed(2)}`
    if (seen.has(key)) continue
    seen.add(key)

    transactions.push({
      date: dateStr,
      description: desc,
      amount,
      installment_current,
      installment_total,
      category_hint: guessCategory(desc),
    })
  }

  if (transactions.length < 2) return null

  const dates = transactions.map((t) => t.date).sort()
  const invoice_month = dates[dates.length - 1].slice(0, 7)
  const invoice_total = transactions.reduce((s, t) => s + t.amount, 0)

  const head = text.slice(0, 12000)
  const closing_day = extractDay('fechamento', head) ?? extractDay('fecha', head)
  const due_day = extractDay('vencimento', head) ?? extractDay('vence', head)

  const limMatch = head.match(/limite\s+(?:total|dispon[ií]vel)?[^\d]{0,30}R\$\s*([\d.,]+)/i)
  let credit_limit: number | null = null
  if (limMatch) {
    const v = parseBrazilianMoney(limMatch[1])
    if (v !== null) credit_limit = Math.abs(v)
  }

  return {
    card_name: `${guessBankFromPdfText(text)} — Fatura`,
    last_four: null,
    credit_limit,
    available_limit: null,
    closing_day,
    due_day,
    invoice_month,
    invoice_total,
    transactions,
  }
}

export const MIN_LOCAL_CARD_TX = 2
