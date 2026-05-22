'use client'

import { useI18n } from '@/lib/i18n'

export default function SkipLink() {
  const { t } = useI18n()

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[10000] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none"
    >
      {t('a11y.skipToContent')}
    </a>
  )
}
