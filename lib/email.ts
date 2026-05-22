export type EmailPayload = {
  to: string
  subject: string
  html: string
  text?: string
}

export type SendEmailResult = { ok: true; id?: string; stub?: boolean } | { ok: false; error: string }

export async function sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Alfred Financeiro <noreply@alfred.app>'

  if (!apiKey) {
    console.info('[email:stub]', payload.to, payload.subject)
    return { ok: true, stub: true }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: body || res.statusText }
    }

    const data = (await res.json()) as { id?: string }
    return { ok: true, id: data.id }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao enviar e-mail.' }
  }
}

export function buildWeeklyReportHtml(params: {
  name: string
  totalRevenues: number
  totalExpenses: number
  unpaidCount: number
  locale: 'pt' | 'en'
}): string {
  const balance = params.totalRevenues - params.totalExpenses
  const fmt = (n: number) =>
    n.toLocaleString(params.locale === 'en' ? 'en-US' : 'pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

  if (params.locale === 'en') {
    return `
      <h2>Weekly report — Alfred Finance</h2>
      <p>Hello, ${params.name}.</p>
      <ul>
        <li>Income this month: <strong>${fmt(params.totalRevenues)}</strong></li>
        <li>Expenses this month: <strong>${fmt(params.totalExpenses)}</strong></li>
        <li>Balance: <strong>${fmt(balance)}</strong></li>
        <li>Open commitments: <strong>${params.unpaidCount}</strong></li>
      </ul>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard">Open dashboard</a></p>
    `
  }

  return `
    <h2>Resumo semanal — Alfred Financeiro</h2>
    <p>Olá, ${params.name}.</p>
    <ul>
      <li>Entradas do mês: <strong>${fmt(params.totalRevenues)}</strong></li>
      <li>Saídas do mês: <strong>${fmt(params.totalExpenses)}</strong></li>
      <li>Saldo: <strong>${fmt(balance)}</strong></li>
      <li>Compromissos em aberto: <strong>${params.unpaidCount}</strong></li>
    </ul>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard">Abrir painel</a></p>
  `
}

export function buildDueReminderHtml(params: {
  name: string
  items: { description: string; amount: number; dueDate: string }[]
  locale: 'pt' | 'en'
}): string {
  const fmt = (n: number) =>
    n.toLocaleString(params.locale === 'en' ? 'en-US' : 'pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  const rows = params.items
    .map((i) => `<li>${i.description} — ${fmt(i.amount)} (${i.dueDate})</li>`)
    .join('')

  if (params.locale === 'en') {
    return `<h2>Payment reminders</h2><p>Hello, ${params.name}.</p><ul>${rows}</ul>`
  }
  return `<h2>Lembretes de vencimento</h2><p>Olá, ${params.name}.</p><ul>${rows}</ul>`
}
