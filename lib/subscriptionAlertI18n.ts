import type { SubscriptionAuditAlert } from './lifestyleFinance'
import { formatMessage } from './i18nFormat'

export function formatSubscriptionAlert(
  alert: SubscriptionAuditAlert,
  t: (key: string) => string,
  locale: 'pt' | 'en' = 'pt',
): string {
  const fmtAmount = (amount: number) =>
    amount.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  if (alert.kind === 'inflation') {
    const key =
      alert.variant === 'catalog'
        ? 'widget.radar.inflationCatalog'
        : 'widget.radar.inflationAvg'
    return formatMessage(t(key), {
      name: alert.subscriptionName,
      amount: fmtAmount(alert.increaseBrl),
    })
  }

  if (alert.variant === 'no_charges') {
    return formatMessage(t('widget.radar.staleNoCharges'), {
      name: alert.subscriptionName,
    })
  }

  return formatMessage(t('widget.radar.stalePayment'), {
    name: alert.subscriptionName,
    days: alert.days ?? 0,
  })
}
