import { ParsedTransaction } from './types'
import { suggestCategory } from '@/lib/auto-categorize'

/**
 * Parser para CSV do Banco Inter (conta corrente).
 *
 * Formato típico (separador ponto-e-vírgula):
 *   Data;Descrição;Valor;Tipo
 *   05/01/2026;Pix Enviado - Fulano;150,00;D
 *   10/01/2026;Pix Recebido - Empresa;2000,00;C
 *
 * Tipo: D = Débito (despesa), C = Crédito (receita)
 */
export function parseInterCsv(content: string): ParsedTransaction[] {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const transactions: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map((c) => c.trim())
    if (cols.length < 3) continue

    const [rawDate, rawDesc, rawValue, rawType] = cols

    const date = parseDateBr(rawDate)
    if (!date) continue

    const value = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'))
    if (isNaN(value)) continue

    // Tipo explícito: D = despesa, C = receita; fallback por sinal do valor
    let type: 'revenue' | 'expense'
    if (rawType) {
      type = rawType.toUpperCase() === 'C' ? 'revenue' : 'expense'
    } else {
      type = value >= 0 ? 'revenue' : 'expense'
    }

    const description = rawDesc.trim()
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

function parseDateBr(raw: string): string | null {
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}
