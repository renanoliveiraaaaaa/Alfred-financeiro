'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { BILLING_PLANS, type BillingInterval, type BillingPlan } from '@/lib/billing/plans'

type Props = {
  stripeEnabled: boolean
  currentPlan?: BillingPlan | null
  currentInterval?: BillingInterval | null
  subscriptionStatus?: string | null
}

function isPaidStatus(status: string | null | undefined) {
  return status === 'active' || status === 'past_due'
}

export default function BillingCheckout({
  stripeEnabled,
  currentPlan = null,
  currentInterval = null,
  subscriptionStatus = null,
}: Props) {
  const { t, locale } = useI18n()
  const [interval, setInterval] = useState<BillingInterval>(currentInterval ?? 'monthly')
  const [loadingPlan, setLoadingPlan] = useState<BillingPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fmt = (value: number) =>
    value.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

  const getActionLabel = (plan: BillingPlan) => {
    const isCurrentPlan = isPaidStatus(subscriptionStatus) && currentPlan === plan
    const isCurrentSelection = isCurrentPlan && currentInterval === interval

    if (isCurrentSelection) return t('billing.action.current')
    if (isCurrentPlan) return t('billing.action.changeInterval')
    if (isPaidStatus(subscriptionStatus) && currentPlan) {
      return plan === 'business' && currentPlan === 'premium'
        ? t('billing.action.upgrade')
        : plan === 'premium' && currentPlan === 'business'
          ? t('billing.action.downgrade')
          : t('billing.action.switch')
    }
    return t('billing.subscribe')
  }

  const startCheckout = async (plan: BillingPlan) => {
    setError(null)
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      })
      const data = (await res.json()) as { url?: string; error?: string; updated?: boolean }
      if (!res.ok) {
        const key = data.error ?? 'billing.error.checkoutFailed'
        setError(t(key) !== key ? t(key) : key)
        return
      }
      if (data.updated) {
        window.location.href = '/settings/billing?billing=updated'
        return
      }
      if (!data.url) {
        setError(t('billing.error.checkoutFailed'))
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
    <div className="w-full space-y-4">
      <div className="flex justify-start">
        <div className="inline-flex rounded-xl border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              interval === 'monthly' ? 'bg-brand text-white' : 'text-muted hover:text-main'
            }`}
          >
            {t('billing.interval.monthly')}
          </button>
          <button
            type="button"
            onClick={() => setInterval('yearly')}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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
          const perMonth = interval === 'yearly' ? plan.yearlyBrl / 12 : plan.monthlyBrl
          const isLoading = loadingPlan === plan.id
          const isCurrentPlan = isPaidStatus(subscriptionStatus) && currentPlan === plan.id
          const isCurrentSelection = isCurrentPlan && currentInterval === interval
          const actionLabel = getActionLabel(plan.id)

          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-4 shadow-sm ${
                isCurrentPlan
                  ? 'border-brand/40 bg-brand/5 ring-1 ring-brand/20'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-main">{t(plan.nameKey)}</p>
                {isCurrentPlan ? (
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                    {t('billing.currentPlanBadge')}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t(plan.descriptionKey)}</p>
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
                disabled={!!loadingPlan || isCurrentSelection}
                onClick={() => startCheckout(plan.id)}
                className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {actionLabel}
              </button>
            </div>
          )
        })}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
