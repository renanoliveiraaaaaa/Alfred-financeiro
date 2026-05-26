import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import {
  findUserIdByStripeCustomer,
  findUserIdByStripeSubscription,
  markProfileCanceled,
  syncProfileFromStripeSubscription,
} from '@/lib/billing/stripeSync'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const body = await request.text()
  const stripe = getStripe()

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid payload'
    console.error('[stripe/webhook] verify failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode !== 'subscription') break

        const userId =
          session.client_reference_id ||
          session.metadata?.supabase_user_id ||
          (session.customer
            ? await findUserIdByStripeCustomer(
                typeof session.customer === 'string' ? session.customer : session.customer.id,
              )
            : null)

        const subId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

        if (userId && subId) {
          const subscription = await stripe.subscriptions.retrieve(subId)
          await syncProfileFromStripeSubscription(subscription, userId)
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId =
          subscription.metadata?.supabase_user_id ||
          (await findUserIdByStripeSubscription(subscription.id)) ||
          (typeof subscription.customer === 'string'
            ? await findUserIdByStripeCustomer(subscription.customer)
            : subscription.customer
              ? await findUserIdByStripeCustomer(subscription.customer.id)
              : null)

        if (!userId) break

        if (event.type === 'customer.subscription.deleted' || subscription.status === 'canceled') {
          await markProfileCanceled(userId)
        } else {
          await syncProfileFromStripeSubscription(subscription, userId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null
        }
        const subId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
        if (!subId) break

        const userId =
          (await findUserIdByStripeSubscription(subId)) ||
          (invoice.customer
            ? await findUserIdByStripeCustomer(
                typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id,
              )
            : null)

        if (!userId) break

        const subscription = await stripe.subscriptions.retrieve(subId)
        await syncProfileFromStripeSubscription(subscription, userId)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
