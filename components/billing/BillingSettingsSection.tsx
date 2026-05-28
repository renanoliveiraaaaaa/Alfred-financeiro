'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { useI18n } from '@/lib/i18n'
import { formatMessage } from '@/lib/i18nFormat'
import CurrentPlanBadge, { type PlanBadgeProfile } from '@/components/profile/CurrentPlanBadge'
import BillingCheckout from '@/components/billing/BillingCheckout'
import BillingManageSection from '@/components/billing/BillingManageSection'
import type { BillingAvailability } from '@/lib/billing/availability'
import type { BillingInterval, BillingPlan } from '@/lib/billing/plans'

type Props = {
  billing: BillingAvailability
}

export default function BillingSettingsSection({ billing }: Props) {
  const supabase = createSupabaseClient()
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const billingNotice = searchParams.get('billing')

  const [loading, setLoading] = useState(true)
  const [planProfile, setPlanProfile] = useState<PlanBadgeProfile | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<BillingPlan | null>(null)
  const [subscriptionInterval, setSubscriptionInterval] = useState<BillingInterval | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user || cancelled) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_status, trial_ends_at, subscription_status, subscription_plan, subscription_billing_cycle')
        .eq('id', auth.user.id)
        .maybeSingle()

      if (cancelled) return

      if (profile) {
        setPlanProfile({
          plan_status: profile.plan_status,
          trial_ends_at: profile.trial_ends_at,
          subscription_status: profile.subscription_status,
          subscription_plan: profile.subscription_plan,
        })
        setSubscriptionStatus(profile.subscription_status ?? null)
        const plan = profile.subscription_plan
        setSubscriptionPlan(plan === 'premium' || plan === 'business' ? plan : null)
        const cycle = profile.subscription_billing_cycle
        setSubscriptionInterval(cycle === 'monthly' || cycle === 'yearly' ? cycle : null)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const trialDaysLeft = useMemo(() => {
    if (!planProfile || planProfile.plan_status !== 'trial' || !planProfile.trial_ends_at) return null
    return Math.ceil((new Date(planProfile.trial_ends_at).getTime() - Date.now()) / 86_400_000)
  }, [planProfile])

  const trialLabel = useMemo(() => {
    if (trialDaysLeft === null) return null
    if (trialDaysLeft < 1) return t('trial.lastDay')
    if (trialDaysLeft === 1) return t('trial.oneDay')
    return t('trial.daysLeft').replace('{n}', String(trialDaysLeft))
  }, [trialDaysLeft, t])

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'past_due'
  const showTrialBanner =
    planProfile?.plan_status === 'trial' && trialLabel !== null && (trialDaysLeft === null || trialDaysLeft >= 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-border" />
        <div className="h-40 animate-pulse rounded-xl bg-border" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {billingNotice === 'success' && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t('settings.billing.success')}
        </div>
      )}
      {billingNotice === 'updated' && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t('settings.billing.updated')}
        </div>
      )}
      {billingNotice === 'canceled' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t('settings.billing.canceled')}
        </div>
      )}

      {planProfile ? <CurrentPlanBadge profile={planProfile} className="w-full" /> : null}

      {showTrialBanner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-950 dark:text-amber-100">{t('settings.billing.trialTitle')}</p>
          <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">
            {trialDaysLeft !== null && trialDaysLeft >= 0
              ? formatMessage(t('settings.billing.trialBody'), { label: trialLabel ?? '' })
              : t('settings.billing.trialExpired')}
          </p>
        </div>
      )}

      {!billing.checkoutAvailable ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-4 text-sm text-muted">
          {!billing.stripeConfigured
            ? t('billing.error.notConfigured')
            : t('billing.error.pricesNotConfigured')}
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-main">{t('settings.billing.plansTitle')}</h2>
            <p className="mt-1 text-xs text-muted">{t('settings.billing.plansSubtitle')}</p>
            <div className="mt-4">
              <BillingCheckout
                stripeEnabled={billing.checkoutAvailable}
                currentPlan={subscriptionPlan}
                currentInterval={subscriptionInterval}
                subscriptionStatus={subscriptionStatus}
              />
            </div>
          </section>

          {isActive && (
            <BillingManageSection
              subscriptionStatus={subscriptionStatus}
              subscriptionPlan={subscriptionPlan}
            />
          )}
        </>
      )}
    </div>
  )
}
