'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { createSupabaseClient } from '@/lib/supabaseClient'
import {
  isPushSupported,
  subscribeBrowserPush,
  unsubscribeBrowserPush,
} from '@/lib/push/client'

type Status = 'loading' | 'idle' | 'working'

export default function PushNotificationsSection() {
  const { t } = useI18n()
  const supabase = createSupabaseClient()
  const [status, setStatus] = useState<Status>('loading')
  const [enabled, setEnabled] = useState(false)
  const [supported, setSupported] = useState(false)
  const [configured, setConfigured] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setSupported(isPushSupported())

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setStatus('idle')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('push_notifications')
        .eq('id', user.id)
        .maybeSingle()

      setEnabled(profile?.push_notifications ?? false)

      try {
        const res = await fetch('/api/push/vapid-public-key')
        setConfigured(res.ok)
      } catch {
        setConfigured(false)
      }

      setStatus('idle')
    })()
  }, [supabase])

  const handleToggle = useCallback(async () => {
    if (!supported || !configured || status === 'working') return

    setMessage(null)
    setStatus('working')

    try {
      if (enabled) {
        await unsubscribeBrowserPush()
        await fetch('/api/push/subscribe', { method: 'DELETE' })
        setEnabled(false)
        setMessage(t('push.disabled'))
      } else {
        const keyRes = await fetch('/api/push/vapid-public-key')
        if (!keyRes.ok) {
          setMessage(t('push.error.notConfigured'))
          return
        }
        const { publicKey } = (await keyRes.json()) as { publicKey: string }
        const subscription = await subscribeBrowserPush(publicKey)
        const saveRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })
        if (!saveRes.ok) {
          const body = (await saveRes.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'push.error.saveFailed')
        }
        setEnabled(true)
        setMessage(t('push.enabled'))
      }
    } catch (err: unknown) {
      const key = err instanceof Error ? err.message : 'push.error.generic'
      const known = [
        'push.error.permissionDenied',
        'push.error.noServiceWorker',
        'push.error.invalidSubscription',
        'push.error.notConfigured',
        'push.error.saveFailed',
      ]
      setMessage(t(known.includes(key) ? key : 'push.error.generic'))
    } finally {
      setStatus('idle')
    }
  }, [configured, enabled, status, supported, t])

  if (!supported) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex gap-3">
          <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
          <div>
            <p className="text-sm font-medium text-main">{t('push.unsupported.title')}</p>
            <p className="mt-1 text-xs text-muted">{t('push.unsupported.desc')}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!configured) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">{t('push.error.notConfigured')}</p>
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <div>
            <p className="text-sm font-medium text-main">{t('push.toggle.title')}</p>
            <p className="mt-1 text-xs text-muted">{t('push.toggle.desc')}</p>
            <p className="mt-2 text-xs text-muted">{t('push.iosHint')}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={status === 'working'}
          onClick={() => void handleToggle()}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-60 ${
            enabled ? 'bg-brand' : 'bg-border'
          }`}
        >
          {status === 'working' ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-surface" aria-hidden />
            </span>
          ) : (
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-surface shadow ring-0 transition-transform duration-200 ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          )}
        </button>
      </div>

      {message ? (
        <p className="text-xs text-muted" role="status">
          {message}
        </p>
      ) : null}
    </section>
  )
}
