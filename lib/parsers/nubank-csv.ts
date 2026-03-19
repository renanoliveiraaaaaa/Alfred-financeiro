import { ParsedTransaction } from './types'
import { suggestCategory } from '@/lib/auto-categorize'

/**
 * Parser para CSV do Nubank (cartão e conta).
 *
 * Formato cartão de crédito (separador vírgula):
 *   date,category,title,amount
 *   2026-01-05,Restaurantes,Almoço no Centro,45.90
 *
 * Formato conta corrente (separador vírgula):
 *   Data,Valor,Identificador,Descrição
 *   05/01/2026,-89.90,abc123,Compra no Mercado
 */
export function parseNubankCsv(content: string): ParsedTransaction[] {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const header = lines[0].toLowerCase()
  const transactions: ParsedTransaction[] = []

  // Detecta formato conta corrente: Data,Valor,Identificador,Descrição
  if (header.startsWith('data,valor')) {
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i])
      if (cols.length < 4) continue

      const [rawDate, rawValue, , rawDesc] = cols
      const date = parseDateBr(rawDate)
      if (!date) continue

      const value = parseFloat(rawValue.replace(',', '.'))
      if (isNaN(value)) continue

      const description = rawDesc.trim()
      const type: 'revenue' | 'expense' = value >= 0 ? 'revenue' : 'expense'
      const amount = Math.abs(value)

      transactions.push({
        date,
        description,
        amount,
        type,
        suggested_category: type === 'expense' ? suggestCategory(description) : undefined,
        original_text: lines[i],
      })
    }
    return transactions
  }

  // Formato cartão: date,category,title,amount
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    if (cols.length < 4) continue

    const [rawDate, , rawTitle, rawAmount] = cols
    const date = parseDate(rawDate)
    if (!date) continue

    const value = parseFloat(rawAmount.replace(',', '.'))
    if (isNaN(value)) continue

    const description = rawTitle.trim()
    // No cartão Nubank o valor já é positivo para gastos
    const type: 'revenue' | 'expense' = value < 0 ? 'revenue' : 'expense'
    const amount = Math.abs(value)

    transactions.push({
      date,
      description,
      amount,
      type,
      suggested_category: type === 'expense' ? suggestCategory(description) : undefined,
      original_text: lines[i],
    })
  }

  return transactions
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/** Parse ISO date YYYY-MM-DD */
function parseDate(raw: string): string | null {
  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}`
}

/** Parse Brazilian date DD/MM/YYYY */
function parseDateBr(raw: string): string | null {
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}
