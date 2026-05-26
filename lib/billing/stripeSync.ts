import type Stripe from 'stripe'
import type { Database } from '@/types/supabase'
import { planFromStripePriceId, type BillingInterval, type BillingPlan } from '@/lib/billing/plans'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

function subscriptionStatusFromStripe(status: Stripe.Subscription.Status): ProfileUpdate['subscription_status'] {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    default:
      return 'trial'
  }
}

function planStatusFromStripe(status: Stripe.Subscription.Status): ProfileUpdate['plan_status'] {
  if (status === 'active' || status === 'trialing' || status === 'past_due') {
    return 'active'
  }
  if (status === 'canceled' || status === 'incomplete_expired') {
    return 'expired'
  }
  return 'trial'
}

function resolvePlanAndInterval(
  subscription: Stripe.Subscription,
  metadata?: Stripe.Metadata | null,
): { plan: BillingPlan; interval: BillingInterval } {
  const metaPlan = metadata?.plan as BillingPlan | undefined
  const metaInterval = metadata?.interval as BillingInterval | undefined
  if (metaPlan && (metaPlan === 'premium' || metaPlan === 'business')) {
    return {
      plan: metaPlan,
      interval: metaInterval === 'yearly' ? 'yearly' : 'monthly',
    }
  }

  const priceId = subscription.items.data[0]?.price?.id
  if (priceId) {
    const mapped = planFromStripePriceId(priceId)
    if (mapped) return mapped
  }

  return { plan: 'premium', interval: 'monthly' }
}

export async function syncProfileFromStripeSubscription(
  subscription: Stripe.Subscription,
  supabaseUserId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { plan, interval } = resolvePlanAndInterval(subscription, subscription.metadata)
  const subStatus = subscriptionStatusFromStripe(subscription.status)
  const planStatus = planStatusFromStripe(subscription.status)
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  const patch: ProfileUpdate = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_plan: plan,
    subscription_billing_cycle: interval,
    subscription_status: subStatus,
    plan_status: planStatus,
    ...(subStatus === 'active' ? { trial_ends_at: null } : {}),
  }

  const { error } = await admin
    .from('profiles')
    .update(patch as ProfileUpdate)
    .eq('id', supabaseUserId)
  if (error) {
    throw new Error(`Falha ao atualizar perfil ${supabaseUserId}: ${error.message}`)
  }
}

export async function markProfileCanceled(supabaseUserId: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      plan_status: 'expired',
      stripe_subscription_id: null,
    } as ProfileUpdate)
    .eq('id', supabaseUserId)

  if (error) {
    throw new Error(`Falha ao cancelar perfil ${supabaseUserId}: ${error.message}`)
  }
}

export async function findUserIdByStripeCustomer(customerId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.id ?? null
}

export async function findUserIdByStripeSubscription(subscriptionId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()
  return data?.id ?? null
}
