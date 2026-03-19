import { ParsedTransaction } from './types'
import { suggestCategory } from '@/lib/auto-categorize'

/**
 * Parser genérico para CSV com colunas: data, descrição, valor.
 *
 * Suporta separadores vírgula (,) e ponto-e-vírgula (;).
 * Datas aceitas: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY.
 * Valores: negativos = despesa, positivos = receita.
 * Tenta detectar automaticamente as colunas pelo cabeçalho.
 */
export function parseGenericCsv(content: string): ParsedTransaction[] {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  // Detecta separador
  const separator = lines[0].includes(';') ? ';' : ','

  const headers = lines[0]
    .split(separator)
    .map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))

  // Mapeia índices das colunas
  const dateIdx = findColIndex(headers, ['data', 'date', 'dt'])
  const descIdx = findColIndex(headers, ['descrição', 'descricao', 'description', 'desc', 'historico', 'histórico', 'memo', 'nome', 'title'])
  const valueIdx = findColIndex(headers, ['valor', 'value', 'amount', 'quantia'])
  const typeIdx = findColIndex(headers, ['tipo', 'type', 'movimento'])

  if (dateIdx === -1 || descIdx === -1 || valueIdx === -1) {
    // Fallback: assume colunas na ordem data(0), descrição(1), valor(2)
    return parseFallback(lines, separator)
  }

  const transactions: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], separator)
    if (cols.length <= Math.max(dateIdx, descIdx, valueIdx)) continue

    const rawDate = cols[dateIdx]
    const rawDesc = cols[descIdx]
    const rawValue = cols[valueIdx]

    const date = parseAnyDate(rawDate)
    if (!date) continue

    const value = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'))
    if (isNaN(value)) continue

    let type: 'revenue' | 'expense'
    if (typeIdx !== -1 && cols[typeIdx]) {
      const t = cols[typeIdx].toUpperCase()
      type = t === 'C' || t === 'CR' || t === 'CREDITO' || t === 'CRÉDITO' ? 'revenue' : 'expense'
    } else {
      type = value >= 0 ? 'revenue' : 'expense'
    }

    const description = rawDesc.trim().replace(/^["']|["']$/g, '')
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

function parseFallback(lines: string[], sep: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], sep)
    if (cols.length < 3) continue

    const date = parseAnyDate(cols[0])
    if (!date) continue

    const value = parseFloat(cols[2].replace(/\./g, '').replace(',', '.'))
    if (isNaN(value)) continue

    const description = cols[1].trim().replace(/^["']|["']$/g, '')
    const type: 'revenue' | 'expense' = value >= 0 ? 'revenue' : 'expense'

    transactions.push({
      date,
      description,
      amount: Math.abs(value),
      type,
      suggested_category: type === 'expense' ? suggestCategory(description) : undefined,
      original_text: lines[i],
    })
  }
  return transactions
}

function findColIndex(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h.includes(candidate))
    if (idx !== -1) return idx
  }
  return -1
}

function splitLine(line: string, sep: string): string[] {
  if (sep === ';') return line.split(';').map((c) => c.trim())

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

function parseAnyDate(raw: string): string | null {
  const s = raw.trim().replace(/^["']|["']$/g, '')

  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  // DD/MM/YYYY or DD-MM-YYYY
  m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`

  return null
}
