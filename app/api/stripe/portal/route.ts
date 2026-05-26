import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getAppBaseUrl, getStripe, isStripeConfigured } from '@/lib/stripe'

export async function POST() {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'billing.error.noCustomer' }, { status: 400 })
  }

  const stripe = getStripe()
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${getAppBaseUrl()}/settings`,
  })

  return NextResponse.json({ url: portal.url })
}
