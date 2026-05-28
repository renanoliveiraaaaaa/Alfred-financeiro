import ExpiredPageClient from './ExpiredPageClient'
import { getBillingAvailability } from '@/lib/billing/availability'

export const dynamic = 'force-dynamic'

export default function ExpiredPage() {
  const billing = getBillingAvailability()
  return <ExpiredPageClient billing={billing} />
}
