export const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${d}/${m}/${y}`
}

/**
 * Converte string "1.234,56" ou "1234.56" para number.
 * Aceita formatos BR (ponto = milhar, vírgula = decimal) e EN.
 */
export const parseBRL = (raw: string): number => {
  if (!raw) return 0
  const cleaned = raw.replace(/\s/g, '')
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0
  }
  return parseFloat(cleaned) || 0
}

/**
 * Máscara de moeda BR para input: "123456" → "1.234,56"
 */
export const maskCurrency = (raw: string): string => {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const cents = parseInt(digits, 10)
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
