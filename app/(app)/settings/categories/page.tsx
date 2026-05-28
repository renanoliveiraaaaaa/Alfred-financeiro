'use client'

import SettingsBackHeader from '@/components/settings/SettingsBackHeader'
import CategoriesSection from '@/components/settings/CategoriesSection'
import { useI18n } from '@/lib/i18n'

export default function CategoriesSettingsPage() {
  const { t } = useI18n()

  return (
    <div className="max-w-2xl space-y-8 bg-background">
      <SettingsBackHeader
        title={t('settings.categories.title')}
        subtitle={t('settings.categories.subtitle')}
      />
      <CategoriesSection />
    </div>
  )
}
