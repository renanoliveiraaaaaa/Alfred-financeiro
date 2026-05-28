'use client'

import { Suspense } from 'react'
import SettingsBackHeader from '@/components/settings/SettingsBackHeader'
import BillingSettingsSection from '@/components/billing/BillingSettingsSection'
import { useI18n } from '@/lib/i18n'

import type { BillingAvailability } from '@/lib/billing/availability'

type Props = {
  billing: BillingAvailability
}

function BillingSettingsContent({ billing }: Props) {
  const { t } = useI18n()

  return (
    <div className="max-w-2xl space-y-8 bg-background">
      <SettingsBackHeader title={t('settings.billing.title')} subtitle={t('settings.billing.subtitle')} />
      <BillingSettingsSection billing={billing} />
    </div>
  )
}

export default function BillingSettingsPageClient({ billing }: Props) {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl space-y-4">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-border" />
          <div className="h-40 animate-pulse rounded-xl bg-border" />
        </div>
      }
    >
      <BillingSettingsContent billing={billing} />
    </Suspense>
  )
}
