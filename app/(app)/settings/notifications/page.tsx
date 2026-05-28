'use client'

import SettingsBackHeader from '@/components/settings/SettingsBackHeader'
import PushNotificationsSection from '@/components/settings/PushNotificationsSection'
import { useI18n } from '@/lib/i18n'

export default function NotificationsSettingsPageClient() {
  const { t } = useI18n()

  return (
    <div className="max-w-2xl space-y-8 bg-background">
      <SettingsBackHeader
        title={t('settings.notifications.title')}
        subtitle={t('settings.notifications.subtitle')}
      />
      <PushNotificationsSection />
    </div>
  )
}
