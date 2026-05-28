import { formatMessage } from '@/lib/i18nFormat'

export function trialDaysLeft(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null
  return Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000)
}

/** Contagem curta: "3 dias restantes", "Último dia", etc. */
export function formatTrialCountdownLabel(t: (key: string) => string, days: number | null): string | null {
  if (days === null) return null
  if (days < 1) return t('trial.lastDay')
  if (days === 1) return t('trial.oneDay')
  return t('trial.daysLeft').replace('{n}', String(days))
}

/** Texto completo do badge de plano em trial */
export function formatTrialPlanBadgeLabel(t: (key: string) => string, days: number | null): string {
  if (days === null) return t('planBadge.trial')
  if (days < 1) return t('planBadge.trialLastDay')
  if (days === 1) return t('planBadge.trialOneDay')
  return formatMessage(t('planBadge.trialDaysLeft'), { n: String(days) })
}
