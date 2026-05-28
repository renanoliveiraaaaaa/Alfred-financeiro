'use client'

import { CreditCard, Tags } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import OrgTeamSection from '@/components/settings/OrgTeamSection'
import SettingsHubLink from '@/components/settings/SettingsHubLink'

export default function SettingsPage() {
  const { t } = useI18n()

  return (
    <div className="max-w-2xl space-y-8 bg-background">
      <div>
        <h1 className="text-xl font-semibold text-main">{t('settings.title')}</h1>
        <p className="mt-0.5 text-sm text-muted">{t('settings.subtitle')}</p>
      </div>

      <nav className="space-y-3" aria-label={t('settings.navLabel')}>
        <SettingsHubLink
          href="/settings/billing"
          Icon={CreditCard}
          title={t('settings.hub.billing.title')}
          description={t('settings.hub.billing.desc')}
        />
        <SettingsHubLink
          href="/settings/categories"
          Icon={Tags}
          title={t('settings.hub.categories.title')}
          description={t('settings.hub.categories.desc')}
        />
      </nav>

      <OrgTeamSection />
    </div>
  )
}
