import webpush from 'web-push'
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { configureWebPush, isPushConfigured } from '@/lib/push/vapid'
import type { PushPayload } from '@/lib/push/messages'

export type SendPushResult =
  | { ok: true; sent: number; removed: number; stub?: boolean }
  | { ok: false; error: string }

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<SendPushResult> {
  if (!isPushConfigured()) {
    console.info('[push:stub]', userId, payload.title)
    return { ok: true, sent: 0, removed: 0, stub: true }
  }

  configureWebPush()

  const supabase = createSupabaseAdminClient()
  const { data: rows, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    return { ok: false, error: error.message }
  }

  const subscriptions = (rows ?? []) as PushSubscriptionRow[]
  if (subscriptions.length === 0) {
    return { ok: true, sent: 0, removed: 0 }
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/dashboard',
  })

  let sent = 0
  let removed = 0
  const staleIds: string[] = []

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
        )
        sent++
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : undefined
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(row.id)
        }
      }
    }),
  )

  if (staleIds.length > 0) {
    const { error: delErr } = await supabase.from('push_subscriptions').delete().in('id', staleIds)
    if (!delErr) removed = staleIds.length
  }

  return { ok: true, sent, removed }
}
