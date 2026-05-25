'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useI18n } from '@/lib/i18n'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useI18n()

  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="max-w-md space-y-3 rounded-2xl border border-border/80 bg-surface/60 px-6 py-8 shadow-lg backdrop-blur-md glass-card">
        <p className="text-sm leading-relaxed text-main">
          {t('error.boundary.message')}
        </p>
        <p className="text-xs text-muted">
          {t('error.boundary.hint')}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-surface"
        >
          {t('error.boundary.retry')}
        </button>
      </div>
    </div>
  )
}
