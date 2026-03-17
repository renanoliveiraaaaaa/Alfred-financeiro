/**
 * Calcula as datas de vencimento de cada parcela respeitando
 * o ciclo de fechamento/vencimento do cartão de crédito.
 *
 * Regra:
 * - Se o dia da compra <= closingDay → entra na fatura corrente → vence no dueDay desse mesmo mês
 *   (ou do mês seguinte se dueDay < closingDay, padrão de alguns cartões)
 * - Se o dia da compra > closingDay → entra na fatura do mês seguinte → vence no dueDay do mês seguinte
 * - Parcelas subsequentes incrementam 1 mês sobre a primeira
 *
 * Lida corretamente com virada de ano (ex: compra em dezembro → janeiro).
 */
export function calculateInstallmentDates(
  purchaseDate: string,
  closingDay: number,
  dueDay: number,
  installments: number,
): string[] {
  const purchase = new Date(purchaseDate + 'T12:00:00')
  const purchaseDayOfMonth = purchase.getDate()

  let baseMonth = purchase.getMonth()
  let baseYear = purchase.getFullYear()

  if (purchaseDayOfMonth > closingDay) {
    baseMonth += 1
    if (baseMonth > 11) {
      baseMonth = 0
      baseYear += 1
    }
  }

  const dates: string[] = []
  for (let i = 0; i < installments; i++) {
    let m = baseMonth + i
    let y = baseYear

    while (m > 11) {
      m -= 12
      y += 1
    }

    const maxDay = new Date(y, m + 1, 0).getDate()
    const day = Math.min(dueDay, maxDay)

    const mm = String(m + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    dates.push(`${y}-${mm}-${dd}`)
  }

  return dates
}

/**
 * Fallback simples: adiciona N meses à data base (sem lógica de cartão).
 */
export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}
