export type BillingPlan = 'premium' | 'business'
export type BillingInterval = 'monthly' | 'yearly'

export type PlanDefinition = {
  id: BillingPlan
  nameKey: string
  descriptionKey: string
  monthlyBrl: number
  yearlyBrl: number
  stripePriceMonthlyEnv: string
  stripePriceYearlyEnv: string
}

/** Valores de referência (UI). No Stripe altere criando novos Price IDs e atualizando env. */
export const BILLING_PLANS: PlanDefinition[] = [
  {
    id: 'premium',
    nameKey: 'billing.plan.premium.name',
    descriptionKey: 'billing.plan.premium.desc',
    monthlyBrl: 39.9,
    yearlyBrl: 399,
    stripePriceMonthlyEnv: 'STRIPE_PRICE_PREMIUM_MONTHLY',
    stripePriceYearlyEnv: 'STRIPE_PRICE_PREMIUM_YEARLY',
  },
  {
    id: 'business',
    nameKey: 'billing.plan.business.name',
    descriptionKey: 'billing.plan.business.desc',
    monthlyBrl: 89.9,
    yearlyBrl: 899,
    stripePriceMonthlyEnv: 'STRIPE_PRICE_BUSINESS_MONTHLY',
    stripePriceYearlyEnv: 'STRIPE_PRICE_BUSINESS_YEARLY',
  },
]

export function getPlanDefinition(plan: BillingPlan): PlanDefinition {
  const def = BILLING_PLANS.find((p) => p.id === plan)
  if (!def) throw new Error(`Plano desconhecido: ${plan}`)
  return def
}

export function resolveStripePriceId(plan: BillingPlan, interval: BillingInterval): string | null {
  const def = getPlanDefinition(plan)
  const envKey = interval === 'monthly' ? def.stripePriceMonthlyEnv : def.stripePriceYearlyEnv
  return process.env[envKey]?.trim() || null
}

export function planFromStripePriceId(priceId: string): { plan: BillingPlan; interval: BillingInterval } | null {
  for (const def of BILLING_PLANS) {
    const monthly = process.env[def.stripePriceMonthlyEnv]?.trim()
    const yearly = process.env[def.stripePriceYearlyEnv]?.trim()
    if (monthly && monthly === priceId) return { plan: def.id, interval: 'monthly' }
    if (yearly && yearly === priceId) return { plan: def.id, interval: 'yearly' }
  }
  return null
}

export function monthlyEquivalentBrl(plan: BillingPlan): number {
  return getPlanDefinition(plan).monthlyBrl
}
