import BillingSettingsPageClient from './BillingSettingsPageClient'
import { getBillingAvailability } from '@/lib/billing/availability'

export const dynamic = 'force-dynamic'

export default function BillingSettingsPage() {
  const billing = getBillingAvailability()
  return <BillingSettingsPageClient billing={billing} />
}
