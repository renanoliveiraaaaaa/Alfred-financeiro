export type PushLocale = 'pt' | 'en'

export type PushPayload = {
  title: string
  body: string
  url?: string
}

export function buildWeeklyReportPush(params: {
  name: string
  totalRevenues: number
  totalExpenses: number
  unpaidCount: number
  locale: PushLocale
}): PushPayload {
  const balance = params.totalRevenues - params.totalExpenses
  const fmt = (n: number) =>
    n.toLocaleString(params.locale === 'en' ? 'en-US' : 'pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

  if (params.locale === 'en') {
    return {
      title: 'Weekly report — Alfred',
      body: `Hi ${params.name}. Balance ${fmt(balance)} · ${params.unpaidCount} open item(s).`,
      url: '/dashboard',
    }
  }

  return {
    title: 'Resumo semanal — Alfred',
    body: `Olá, ${params.name}. Saldo ${fmt(balance)} · ${params.unpaidCount} compromisso(s) em aberto.`,
    url: '/dashboard',
  }
}

export function buildDueReminderPush(params: {
  name: string
  items: { description: string; amount: number; dueDate: string }[]
  locale: PushLocale
}): PushPayload {
  const count = params.items.length
  const first = params.items[0]
  const fmt = (n: number) =>
    n.toLocaleString(params.locale === 'en' ? 'en-US' : 'pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

  if (params.locale === 'en') {
    const detail =
      count === 1 && first
        ? `${first.description} — ${fmt(first.amount)}`
        : `${count} payment(s) due in the next 3 days`
    return {
      title: 'Payment reminders — Alfred',
      body: `Hi ${params.name}. ${detail}.`,
      url: '/expenses',
    }
  }

  const detail =
    count === 1 && first
      ? `${first.description} — ${fmt(first.amount)}`
      : `${count} vencimento(s) nos próximos 3 dias`
  return {
    title: 'Lembretes de vencimento — Alfred',
    body: `Olá, ${params.name}. ${detail}.`,
    url: '/expenses',
  }
}
