export const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Retorna saudação conforme hora local: Bom dia (0-11), Boa tarde (12-17), Boa noite (18-23) */
export const getGreeting = (): string => {
  const h = new Date().getHours()
  if (h >= 0 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Retorna nome do mês em português com primeira letra maiúscula (ex: Março, Abril) */
export const getMonthName = (): string => {
  const name = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** Nome do mês + ano para um mês calendário (1–12), ex: "Março 2026" */
export const getMonthYearLabel = (year: number, month1to12: number): string => {
  const d = new Date(year, month1to12 - 1, 1)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d)
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`
}

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
