import ExpiredPageClient from './ExpiredPageClient'

export default function ExpiredPage() {
  const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY?.trim())
  return <ExpiredPageClient stripeEnabled={stripeEnabled} />
}
