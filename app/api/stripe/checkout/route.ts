import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { syncProfileFromStripeSubscription } from '@/lib/billing/stripeSync'
import { getAppBaseUrl, getStripe, isStripeConfigured } from '@/lib/stripe'
import { getPlanDefinition, resolveStripePriceId, type BillingInterval, type BillingPlan } from '@/lib/billing/plans'

type CheckoutBody = {
  plan?: BillingPlan
  interval?: BillingInterval
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'billing.error.notConfigured' }, { status: 503 })
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'billing.error.unauthorized' }, { status: 401 })
  }

  let body: CheckoutBody
  try {
    body = (await request.json()) as CheckoutBody
  } catch {
    return NextResponse.json({ error: 'billing.error.invalidBody' }, { status: 400 })
  }

  const plan = body.plan
  const interval = body.interval ?? 'monthly'
  if (plan !== 'premium' && plan !== 'business') {
    return NextResponse.json({ error: 'billing.error.invalidPlan' }, { status: 400 })
  }
  if (interval !== 'monthly' && interval !== 'yearly') {
    return NextResponse.json({ error: 'billing.error.invalidInterval' }, { status: 400 })
  }

  const priceId = resolveStripePriceId(plan, interval)
  if (!priceId) {
    return NextResponse.json({ error: 'billing.error.priceMissing' }, { status: 503 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, subscription_status, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const stripe = getStripe()
  const appUrl = getAppBaseUrl()
  const hasActiveSubscription =
    profile?.stripe_subscription_id &&
    (profile.subscription_status === 'active' || profile.subscription_status === 'past_due')

  if (hasActiveSubscription && profile?.stripe_subscription_id) {
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
    const itemId = subscription.items.data[0]?.id
    if (!itemId) {
      return NextResponse.json({ error: 'billing.error.checkoutFailed' }, { status: 500 })
    }

    const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'create_prorations',
      metadata: {
        supabase_user_id: user.id,
        plan,
        interval,
        plan_label: plan,
      },
    })

    await syncProfileFromStripeSubscription(updated, user.id)
    return NextResponse.json({ updated: true })
  }

  let customerId = profile?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const planDef = getPlanDefinition(plan)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings/billing?billing=success`,
    cancel_url: `${appUrl}/settings/billing?billing=canceled`,
    client_reference_id: user.id,
    metadata: {
      supabase_user_id: user.id,
      plan,
      interval,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan,
        interval,
        plan_label: planDef.id,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    locale: 'pt-BR',
  })

  if (!session.url) {
    return NextResponse.json({ error: 'billing.error.checkoutFailed' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
