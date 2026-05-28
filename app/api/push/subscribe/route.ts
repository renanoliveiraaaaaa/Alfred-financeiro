import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { isPushConfigured } from '@/lib/push/vapid'

type SubscribeBody = {
  subscription?: {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
}

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'push.error.notConfigured' }, { status: 503 })
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'push.error.unauthorized' }, { status: 401 })
  }

  let body: SubscribeBody
  try {
    body = (await request.json()) as SubscribeBody
  } catch {
    return NextResponse.json({ error: 'push.error.invalidBody' }, { status: 400 })
  }

  const endpoint = body.subscription?.endpoint
  const p256dh = body.subscription?.keys?.p256dh
  const auth = body.subscription?.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'push.error.invalidSubscription' }, { status: 400 })
  }

  const userAgent = request.headers.get('user-agent')

  const { error: upsertErr } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
    },
    { onConflict: 'user_id,endpoint' },
  )

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ push_notifications: true })
    .eq('id', user.id)

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'push.error.unauthorized' }, { status: 401 })
  }

  let endpoint: string | undefined
  try {
    const body = (await request.json()) as { endpoint?: string }
    endpoint = body.endpoint
  } catch {
    endpoint = undefined
  }

  if (endpoint) {
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
  } else {
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
  }

  const { data: remaining } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (!remaining || remaining.length === 0) {
    await supabase.from('profiles').update({ push_notifications: false }).eq('id', user.id)
  }

  return NextResponse.json({ ok: true })
}
