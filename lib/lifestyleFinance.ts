import { getCalendarMonthRange, shiftCalendarMonth } from '@/lib/monthRange'

/** Gastos tratados como “estilo de vida” para o limite de conforto. */
export const LIFESTYLE_SPEND_CATEGORIES = new Set(['lazer', 'outros'])

export type GoalLike = {
  target_amount: number
  current_amount: number
  deadline: string | null
}

export type ExpenseLike = {
  amount: number | string | null
  category: string | null
  description?: string | null
  due_date: string | null
}

export type SubscriptionLike = {
  id: string
  name: string
  amount: number | string | null
  active: boolean
  created_at: string
}

function num(n: number | string | null | undefined): number {
  return Number(n ?? 0) || 0
}

function normCat(c: string | null | undefined): string {
  return (c && String(c).trim().toLowerCase()) || 'outros'
}

/** Despesas “fixas / contas / essenciais”: tudo exceto lazer e outros no mês visível. */
export function sumFixedAndEssentialExpenses(monthExpenses: ExpenseLike[]): number {
  return monthExpenses.reduce((s, e) => {
    const cat = normCat(e.category)
    if (LIFESTYLE_SPEND_CATEGORIES.has(cat)) return s
    return s + num(e.amount)
  }, 0)
}

export function sumLifestyleSpend(monthExpenses: ExpenseLike[]): number {
  return monthExpenses.reduce((s, e) => {
    const cat = normCat(e.category)
    if (!LIFESTYLE_SPEND_CATEGORIES.has(cat)) return s
    return s + num(e.amount)
  }, 0)
}

/**
 * Compromisso mensal estimado para metas (prazo em meses até deadline).
 * Metas sem prazo ou já vencidas não entram; meta já atingida = 0.
 */
export function sumMonthlyInvestmentCommitment(
  goals: GoalLike[],
  viewYear: number,
  viewMonth1to12: number,
): number {
  const { start: monthStartStr } = getCalendarMonthRange(viewYear, viewMonth1to12)
  const ref = new Date(monthStartStr + 'T12:00:00')

  let total = 0
  for (const g of goals) {
    const remaining = num(g.target_amount) - num(g.current_amount)
    if (remaining <= 0) continue
    if (!g.deadline) continue
    const end = new Date(g.deadline + 'T12:00:00')
    if (end <= ref) continue

    const months =
      (end.getFullYear() - ref.getFullYear()) * 12 + (end.getMonth() - ref.getMonth())
    const m = Math.max(1, months)
    total += remaining / m
  }
  return Math.round(total * 100) / 100
}

export type BuyingPowerResult = {
  totalRevenues: number
  fixedCommitted: number
  monthlyInvestCommitment: number
  lifestyleSpend: number
  dinheiroLivre: number
  /** % do dinheiro livre já usado em lazer/outros (0–1+); null se não aplicável */
  lifestyleShareOfFree: number | null
  comfortWarning: boolean
}

export function computeBuyingPower(params: {
  totalRevenues: number
  monthExpenses: ExpenseLike[]
  goals: GoalLike[]
  viewYear: number
  viewMonth1to12: number
}): BuyingPowerResult {
  const fixedCommitted = sumFixedAndEssentialExpenses(params.monthExpenses)
  const lifestyleSpend = sumLifestyleSpend(params.monthExpenses)
  const monthlyInvestCommitment = sumMonthlyInvestmentCommitment(
    params.goals,
    params.viewYear,
    params.viewMonth1to12,
  )

  const dinheiroLivre = Math.round(
    (params.totalRevenues - fixedCommitted - monthlyInvestCommitment) * 100,
  ) / 100

  let lifestyleShareOfFree: number | null = null
  if (dinheiroLivre > 0) {
    lifestyleShareOfFree = lifestyleSpend / dinheiroLivre
  }

  const comfortWarning =
    dinheiroLivre > 0
      ? lifestyleShareOfFree !== null && lifestyleShareOfFree > 0.8
      : lifestyleSpend > 0 || dinheiroLivre < 0

  return {
    totalRevenues: params.totalRevenues,
    fixedCommitted,
    monthlyInvestCommitment,
    lifestyleSpend,
    dinheiroLivre,
    lifestyleShareOfFree,
    comfortWarning,
  }
}

export type SubscriptionInflationAlert = {
  kind: 'inflation'
  subscriptionName: string
  increaseBrl: number
  message: string
}

export type SubscriptionStaleAlert = {
  kind: 'stale'
  subscriptionName: string
  message: string
}

export type SubscriptionAuditAlert = SubscriptionInflationAlert | SubscriptionStaleAlert

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function subscriptionExpenseMatches(e: ExpenseLike, subName: string): boolean {
  if (!e.due_date) return false
  const desc = e.description ?? ''
  if (expenseLikelyFromSubscription(desc, subName)) return true
  if (normCat(e.category) === 'assinaturas') {
    const d = normalizeText(desc)
    const n = normalizeText(subName.trim())
    return n.length >= 2 && d.includes(n)
  }
  return false
}

export function expenseLikelyFromSubscription(description: string, subscriptionName: string): boolean {
  const d = normalizeText(description)
  const n = normalizeText(subscriptionName.trim())
  if (n.length < 2) return false
  if (d.includes(n)) return true
  const words = n.split(/\s+/).filter((w) => w.length >= 4)
  return words.some((w) => d.includes(w))
}

function monthKeyFromDueDate(due: string): string {
  return due.slice(0, 7)
}

/**
 * Janela de 3 meses civis ancorada no mês visualizado: (m-2) .. (m).
 */
export function threeMonthWindowEnd(viewYear: number, viewMonth1to12: number): {
  start: string
  end: string
} {
  const m2 = shiftCalendarMonth(viewYear, viewMonth1to12, -2)
  const startRange = getCalendarMonthRange(m2.year, m2.month)
  const endRange = getCalendarMonthRange(viewYear, viewMonth1to12)
  return { start: startRange.start, end: endRange.end }
}

export function auditSubscriptions(
  subscriptions: SubscriptionLike[],
  expensesInWindow: ExpenseLike[],
  viewYear: number,
  viewMonth1to12: number,
): SubscriptionAuditAlert[] {
  const alerts: SubscriptionAuditAlert[] = []
  const { end: viewedMonthEnd } = getCalendarMonthRange(viewYear, viewMonth1to12)
  const viewedMonthKey = viewedMonthEnd.slice(0, 7)

  const today = new Date()
  const staleDays = 120

  for (const sub of subscriptions) {
    if (!sub.active) continue
    const subName = sub.name?.trim() || 'Assinatura'
    const catalogAmount = num(sub.amount)

    const matches = expensesInWindow.filter((e) => subscriptionExpenseMatches(e, subName))

    const byMonth = new Map<string, number>()
    for (const e of matches) {
      if (!e.due_date) continue
      const mk = monthKeyFromDueDate(e.due_date)
      byMonth.set(mk, (byMonth.get(mk) ?? 0) + num(e.amount))
    }

    const currentMonthAmt = byMonth.get(viewedMonthKey) ?? null
    const prevAmounts = [...byMonth.entries()]
      .filter(([k]) => k < viewedMonthKey)
      .map(([, v]) => v)
    const lastTwo = prevAmounts.slice(-2)
    const avgPrev =
      lastTwo.length > 0 ? lastTwo.reduce((a, b) => a + b, 0) / lastTwo.length : null

    let done = false

    if (currentMonthAmt != null && avgPrev != null && avgPrev > 0) {
      const increase = Math.round((currentMonthAmt - avgPrev) * 100) / 100
      if (increase >= 1 && currentMonthAmt >= avgPrev * 1.05) {
        alerts.push({
          kind: 'inflation',
          subscriptionName: subName,
          increaseBrl: increase,
          message: `Alerta de Inflação Silenciosa: Sua assinatura ${subName} subiu R$ ${increase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Deseja que eu verifique o motivo?`,
        })
        done = true
      }
    }

    if (
      !done &&
      currentMonthAmt != null &&
      catalogAmount > 0 &&
      currentMonthAmt > catalogAmount * 1.05
    ) {
      const increase = Math.round((currentMonthAmt - catalogAmount) * 100) / 100
      if (increase >= 1) {
        alerts.push({
          kind: 'inflation',
          subscriptionName: subName,
          increaseBrl: increase,
          message: `Alerta de Inflação Silenciosa: Sua assinatura ${subName} subiu R$ ${increase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} face ao valor cadastrado. Deseja que eu verifique o motivo?`,
        })
        done = true
      }
    }

    if (!done) {
      const lastDue = matches
        .map((e) => e.due_date)
        .filter(Boolean)
        .sort()
        .pop()
      if (lastDue) {
        const last = new Date(lastDue + 'T12:00:00')
        const days = (today.getTime() - last.getTime()) / 86_400_000
        if (days > staleDays) {
          alerts.push({
            kind: 'stale',
            subscriptionName: subName,
            message: `Possível assinatura «${subName}» sem registo de pagamento recente (${Math.floor(days)} dias). Vale confirmar se ainda utiliza este serviço, Senhor.`,
          })
        }
      } else {
        const created = new Date(sub.created_at)
        const daysSinceCreate = (today.getTime() - created.getTime()) / 86_400_000
        if (daysSinceCreate > 200) {
          alerts.push({
            kind: 'stale',
            subscriptionName: subName,
            message: `Assinatura «${subName}» ativa há muito tempo sem lançamentos associados no período analisado. Deseja rever ou registar o pagamento?`,
          })
        }
      }
    }
  }

  return alerts
}
