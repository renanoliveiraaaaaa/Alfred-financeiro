/** Primeiro e último dia (YYYY-MM-DD) de um mês calendário local (month 1–12). */
export function getCalendarMonthRange(year: number, month1to12: number): { start: string; end: string } {
  const start = `${year}-${String(month1to12).padStart(2, '0')}-01`
  const last = new Date(year, month1to12, 0)
  const end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
  return { start, end }
}

export function shiftCalendarMonth(
  year: number,
  month1to12: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month1to12 - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function getCurrentCalendarMonth(): { year: number; month: number } {
  const n = new Date()
  return { year: n.getFullYear(), month: n.getMonth() + 1 }
}

/** true se (year, month) é estritamente depois do mês atual do relógio */
export function isMonthAfterNow(year: number, month1to12: number): boolean {
  const cur = getCurrentCalendarMonth()
  if (year > cur.year) return true
  if (year < cur.year) return false
  return month1to12 > cur.month
}

export function isSameMonthAsNow(year: number, month1to12: number): boolean {
  const cur = getCurrentCalendarMonth()
  return year === cur.year && month1to12 === cur.month
}
