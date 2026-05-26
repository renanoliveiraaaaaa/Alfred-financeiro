'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { BILLING_PLANS, type BillingInterval, type BillingPlan } from '@/lib/billing/plans'

type Props = {
  stripeEnabled: boolean
}

export default function BillingCheckout({ stripeEnabled }: Props) {
  const { t, locale } = useI18n()
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<BillingPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fmt = (value: number) =>
    value.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

  const startCheckout = async (plan: BillingPlan) => {
    setError(null)
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        const key = data.error ?? 'billing.error.checkoutFailed'
        setError(t(key) !== key ? t(key) : key)
        return
      }
      window.location.href = data.url
    } catch {
      setError(t('billing.error.checkoutFailed'))
    } finally {
      setLoadingPlan(null)
    }
  }

  if (!stripeEnabled) {
    return null
  }

  return (
    <div className="w-full max-w-lg space-y-4 text-left">
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              interval === 'monthly' ? 'bg-brand text-white' : 'text-muted hover:text-main'
            }`}
          >
            {t('billing.interval.monthly')}
          </button>
          <button
            type="button"
            onClick={() => setInterval('yearly')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              interval === 'yearly' ? 'bg-brand text-white' : 'text-muted hover:text-main'
            }`}
          >
            {t('billing.interval.yearly')}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {BILLING_PLANS.map((plan) => {
          const price = interval === 'monthly' ? plan.monthlyBrl : plan.yearlyBrl
          const perMonth =
            interval === 'yearly' ? plan.yearlyBrl / 12 : plan.monthlyBrl
          const isLoading = loadingPlan === plan.id

          return (
            <div
              key={plan.id}
              className="rounded-xl border border-border bg-surface p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-main">{t(plan.nameKey)}</p>
              <p className="mt-1 text-xs text-muted leading-relaxed">{t(plan.descriptionKey)}</p>
              <p className="mt-3 text-xl font-semibold tabular-nums text-main">
                {fmt(price)}
                <span className="text-xs font-normal text-muted">
                  {interval === 'monthly' ? t('billing.perMonth') : t('billing.perYear')}
                </span>
              </p>
              {interval === 'yearly' && (
                <p className="mt-1 text-xs text-muted">
                  {t('billing.equivalentMonthly').replace('{price}', fmt(perMonth))}
                </p>
              )}
              <button
                type="button"
                disabled={!!loadingPlan}
                onClick={() => startCheckout(plan.id)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 min-h-[44px]"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {t('billing.subscribe')}
              </button>
            </div>
          )
        })}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  )
}
