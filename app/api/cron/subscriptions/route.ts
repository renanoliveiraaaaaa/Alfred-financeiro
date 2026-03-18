import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

function getNextBillingDate(current: string, cycle: 'mensal' | 'anual'): string {
  const date = new Date(current + 'T12:00:00')
  if (cycle === 'anual') {
    date.setFullYear(date.getFullYear() + 1)
  } else {
    date.setMonth(date.getMonth() + 1)
  }
  return date.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const today = new Date().toISOString().slice(0, 10)

  const { data: subscriptions, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('active', true)
    .lte('next_billing_date', today)
    .order('next_billing_date', { ascending: true })

  if (fetchErr) {
    console.error('[cron/subscriptions] Fetch error:', fetchErr)
    return NextResponse.json(
      { success: false, error: fetchErr.message },
      { status: 500 }
    )
  }

  const subs = (subscriptions ?? []) as Subscription[]
  let processed = 0

  for (const sub of subs) {
    try {
      const { error: insertErr } = await supabase.from('expenses').insert({
        user_id: sub.user_id,
        amount: Number(sub.amount),
        description: `${sub.name} (assinatura)`,
        category: sub.category || 'assinaturas',
        payment_method: 'debito',
        due_date: sub.next_billing_date,
        paid: true,
      })

      if (insertErr) {
        console.error(`[cron/subscriptions] Insert expense failed for sub ${sub.id}:`, insertErr)
        continue
      }

      const nextDate = getNextBillingDate(sub.next_billing_date, sub.billing_cycle)
      const { error: updateErr } = await supabase
        .from('subscriptions')
        .update({ next_billing_date: nextDate })
        .eq('id', sub.id)

      if (updateErr) {
        console.error(`[cron/subscriptions] Update subscription failed for ${sub.id}:`, updateErr)
        continue
      }

      processed++
    } catch (err) {
      console.error(`[cron/subscriptions] Error processing sub ${sub.id}:`, err)
    }
  }

  return NextResponse.json({ success: true, processed })
}
