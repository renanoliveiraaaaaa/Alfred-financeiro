import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getNextReceiptDate(current: string, frequency: 'mensal' | 'quinzenal' | 'semanal'): string {
  const date = new Date(current + 'T12:00:00')
  if (frequency === 'semanal') {
    date.setDate(date.getDate() + 7)
  } else if (frequency === 'quinzenal') {
    date.setDate(date.getDate() + 14)
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
    return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const today = new Date().toISOString().slice(0, 10)

  const { data: sources, error: fetchErr } = await supabase
    .from('income_sources')
    .select('*')
    .eq('active', true)
    .lte('next_receipt_date', today)
    .order('next_receipt_date', { ascending: true })

  if (fetchErr) {
    console.error('[cron/income-sources] Fetch error:', fetchErr)
    return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
  }

  let processed = 0

  for (const src of sources ?? []) {
    try {
      if (!src.organization_id || !src.user_id) {
        console.error(`[cron/income-sources] Source ${src.id} missing org/user, skipping.`)
        continue
      }

      const { error: insertErr } = await supabase.from('revenues').insert({
        user_id: src.user_id,
        organization_id: src.organization_id,
        amount: Number(src.amount),
        description: `${src.name} (fonte de renda)`,
        date: src.next_receipt_date,
        expected_date: src.next_receipt_date,
        received: true,
      })

      if (insertErr) {
        console.error(`[cron/income-sources] Insert revenue failed for ${src.id}:`, insertErr)
        continue
      }

      const nextDate = getNextReceiptDate(src.next_receipt_date, src.frequency)
      const { error: updateErr } = await supabase
        .from('income_sources')
        .update({ next_receipt_date: nextDate })
        .eq('id', src.id)

      if (updateErr) {
        console.error(`[cron/income-sources] Update source failed for ${src.id}:`, updateErr)
        continue
      }

      processed++
    } catch (err) {
      console.error(`[cron/income-sources] Error processing ${src.id}:`, err)
    }
  }

  return NextResponse.json({ success: true, processed })
}
