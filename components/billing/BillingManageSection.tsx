'use client'

import { useState } from 'react'
import { Loader2, CreditCard } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type Props = {
  subscriptionStatus?: string | null
  subscriptionPlan?: string | null
}

export default function BillingManageSection({
  subscriptionStatus,
  subscriptionPlan,
}: Props) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'past_due'

  if (!isActive) return null

  const openPortal = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        const key = data.error ?? 'billing.error.portalFailed'
        setError(t(key) !== key ? t(key) : key)
        return
      }
      window.location.href = data.url
    } catch {
      setError(t('billing.error.portalFailed'))
    } finally {
      setLoading(false)
    }
  }

  const planLabel =
    subscriptionPlan === 'business'
      ? t('billing.plan.business.name')
      : subscriptionPlan === 'premium'
        ? t('billing.plan.premium.name')
        : t('billing.plan.unknown')

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <CreditCard className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-main">{t('billing.manage.title')}</h2>
          <p className="mt-1 text-sm text-muted">
            {t('billing.manage.subtitle').replace('{plan}', planLabel)}
          </p>
          <button
            type="button"
            onClick={openPortal}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-main hover:bg-background disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('billing.manage.cta')}
          </button>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </section>
  )
}
