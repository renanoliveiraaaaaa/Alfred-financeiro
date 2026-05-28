import { isStripeConfigured } from '@/lib/stripe'
import { BILLING_PLANS, resolveStripePriceId } from '@/lib/billing/plans'

export type BillingAvailability = {
  /** Stripe secret key present — checkout/portal APIs can run */
  stripeConfigured: boolean
  /** At least one plan price ID is set in env */
  hasAnyPrice: boolean
  /** All four price IDs (premium/business × monthly/yearly) are set */
  hasAllPrices: boolean
  /** UI may show plan cards and checkout buttons */
  checkoutAvailable: boolean
}

export function getBillingAvailability(): BillingAvailability {
  const stripeConfigured = isStripeConfigured()

  const priceChecks = BILLING_PLANS.flatMap((plan) => [
    resolveStripePriceId(plan.id, 'monthly'),
    resolveStripePriceId(plan.id, 'yearly'),
  ])

  const hasAnyPrice = priceChecks.some(Boolean)
  const hasAllPrices = priceChecks.every(Boolean)

  return {
    stripeConfigured,
    hasAnyPrice,
    hasAllPrices,
    checkoutAvailable: stripeConfigured && hasAnyPrice,
  }
}
