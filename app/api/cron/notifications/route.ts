import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, buildWeeklyReportHtml, buildDueReminderHtml } from '@/lib/email'
import { buildDueReminderPush, buildWeeklyReportPush } from '@/lib/push/messages'
import { sendPushToUser } from '@/lib/push/send'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const inThreeDays = new Date(today)
  inThreeDays.setDate(inThreeDays.getDate() + 3)
  const dueLimit = inThreeDays.toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)

  const isMonday = today.getDay() === 1

  type NotifyProfile = {
    id: string
    full_name: string | null
    weekly_report: boolean
    push_notifications: boolean
    locale: 'pt' | 'en'
  }

  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, weekly_report, push_notifications, locale')

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  let weeklySent = 0
  let remindersSent = 0
  let pushWeeklySent = 0
  let pushRemindersSent = 0
  const errors: string[] = []

  for (const profile of (profiles ?? []) as NotifyProfile[]) {
    const locale = (profile.locale === 'en' ? 'en' : 'pt') as 'pt' | 'en'
    const name = profile.full_name?.split(' ')[0] || 'Cliente'

    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    const email = authUser.user?.email
    if (!email) continue

    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', profile.id)
      .eq('type', 'personal')
      .limit(1)

    const orgId = orgs?.[0]?.id
    if (!orgId) continue

    if (isMonday && profile.weekly_report) {
      const [revRes, expRes, unpaidRes] = await Promise.all([
        supabase.from('revenues').select('amount').eq('organization_id', orgId).gte('date', monthStart),
        supabase.from('expenses').select('amount').eq('organization_id', orgId).gte('due_date', monthStart),
        supabase.from('expenses').select('id').eq('organization_id', orgId).eq('paid', false),
      ])

      const totalRevenues = (revRes.data ?? []).reduce((s, r) => s + Number(r.amount || 0), 0)
      const totalExpenses = (expRes.data ?? []).reduce((s, e) => s + Number(e.amount || 0), 0)
      const unpaidCount = unpaidRes.data?.length ?? 0

      const result = await sendEmail({
        to: email,
        subject:
          locale === 'en'
            ? 'Weekly report — Alfred Financial Assistant'
            : 'Resumo semanal — Alfred — Assistente Financeiro',
        html: buildWeeklyReportHtml({ name, totalRevenues, totalExpenses, unpaidCount, locale }),
      })

      if (result.ok) weeklySent++
      else errors.push(`${email}: ${result.error}`)

      if (profile.push_notifications) {
        const pushResult = await sendPushToUser(
          profile.id,
          buildWeeklyReportPush({ name, totalRevenues, totalExpenses, unpaidCount, locale }),
        )
        if (pushResult.ok && pushResult.sent > 0) pushWeeklySent++
        else if (!pushResult.ok) errors.push(`${profile.id} push weekly: ${pushResult.error}`)
      }
    }

    const { data: dueExpenses } = await supabase
      .from('expenses')
      .select('description, amount, due_date')
      .eq('organization_id', orgId)
      .eq('paid', false)
      .gte('due_date', todayStr)
      .lte('due_date', dueLimit)
      .limit(5)

    if (dueExpenses && dueExpenses.length > 0) {
      const items = dueExpenses.map((e) => ({
        description: e.description,
        amount: Number(e.amount || 0),
        dueDate: e.due_date ?? todayStr,
      }))

      const result = await sendEmail({
        to: email,
        subject: locale === 'en' ? 'Payment reminders — Alfred' : 'Lembretes de vencimento — Alfred',
        html: buildDueReminderHtml({ name, locale, items }),
      })
      if (result.ok) remindersSent++
      else errors.push(`${email}: ${result.error}`)

      if (profile.push_notifications) {
        const pushResult = await sendPushToUser(
          profile.id,
          buildDueReminderPush({ name, locale, items }),
        )
        if (pushResult.ok && pushResult.sent > 0) pushRemindersSent++
        else if (!pushResult.ok) errors.push(`${profile.id} push reminder: ${pushResult.error}`)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    weeklySent,
    remindersSent,
    pushWeeklySent,
    pushRemindersSent,
    errors: errors.slice(0, 10),
  })
}
