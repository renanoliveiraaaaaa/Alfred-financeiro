'use client'

import { useMemo } from 'react'
import { useI18n } from '@/lib/i18n'
import { formatTrialPlanBadgeLabel, trialDaysLeft } from '@/lib/billing/trialLabel'
import type { Database } from '@/types/supabase'

export type PlanBadgeProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'plan_status' | 'trial_ends_at' | 'subscription_status' | 'subscription_plan'
>

type PlanKind = 'trial' | 'premium' | 'business' | 'expired' | 'free'

function resolvePlanKind(profile: PlanBadgeProfile): PlanKind {
  const planStatus = profile.plan_status ?? 'trial'
  const subStatus = profile.subscription_status ?? 'trial'
  const subPlan = profile.subscription_plan ?? 'free'

  if ((subStatus === 'active' || subStatus === 'past_due') && subPlan === 'business') {
    return 'business'
  }
  if ((subStatus === 'active' || subStatus === 'past_due') && subPlan === 'premium') {
    return 'premium'
  }

  if (planStatus === 'expired' || subStatus === 'canceled') {
    return 'expired'
  }

  if (planStatus === 'trial' && profile.trial_ends_at) {
    if (new Date() > new Date(profile.trial_ends_at)) {
      return 'expired'
    }
  }

  if (planStatus === 'trial' || subStatus === 'trial') {
    return 'trial'
  }

  return 'free'
}

const BADGE_STYLES: Record<PlanKind, string> = {
  trial:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  premium:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  business:
    'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  expired:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  free: 'border-border bg-surface text-muted',
}

type Props = {
  profile: PlanBadgeProfile
  className?: string
}

export default function CurrentPlanBadge({ profile, className = '' }: Props) {
  const { t } = useI18n()
  const kind = useMemo(() => resolvePlanKind(profile), [profile])

  const label = useMemo(() => {
    switch (kind) {
      case 'premium':
        return t('planBadge.premium')
      case 'business':
        return t('planBadge.business')
      case 'expired':
        return t('planBadge.expired')
      case 'free':
        return t('planBadge.free')
      case 'trial':
        return formatTrialPlanBadgeLabel(t, trialDaysLeft(profile.trial_ends_at))
    }
  }, [kind, profile.trial_ends_at, t])

  return (
    <div
      className={`inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${BADGE_STYLES[kind]} ${className}`}
    >
      <span className="font-medium opacity-80">{t('planBadge.yourPlan')}</span>
      <span className="font-semibold">{label}</span>
    </div>
  )
}
