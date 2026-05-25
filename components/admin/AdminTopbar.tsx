'use client'

import { useI18n } from '@/lib/i18n'

export default function AdminTopbar() {
  const { t } = useI18n()

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-4 lg:px-6">
      <span className="text-sm font-medium text-slate-600">{t('admin.topbar.restricted')}</span>
    </header>
  )
}
