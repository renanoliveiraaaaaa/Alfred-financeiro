'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type Props = {
  title: string
  subtitle?: string
}

export default function SettingsBackHeader({ title, subtitle }: Props) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <Link
        href="/settings"
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-main"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        {t('settings.back')}
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-main">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
    </div>
  )
}
