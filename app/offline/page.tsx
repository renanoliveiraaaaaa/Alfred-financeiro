'use client'

import Link from 'next/link'
import { WifiOff } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export default function OfflinePage() {
  const { t } = useI18n()

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="h-14 w-14 rounded-full bg-border flex items-center justify-center mb-4">
        <WifiOff className="h-7 w-7 text-muted" aria-hidden />
      </div>
      <h1 className="text-lg font-semibold text-main">{t('pwa.offline.title')}</h1>
      <p className="text-sm text-muted mt-2 max-w-sm">{t('pwa.offline.body')}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        {t('nav.home')}
      </Link>
    </div>
  )
}
