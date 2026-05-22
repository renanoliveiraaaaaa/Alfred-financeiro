'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Shield, ShieldCheck, ShieldOff } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { useI18n } from '@/lib/i18n'
import { logActivity } from '@/lib/activityLog'

type Props = {
  userId: string
}

export default function TwoFactorPanel({ userId }: Props) {
  const { t } = useI18n()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: listErr } = await supabase.auth.mfa.listFactors()
      if (listErr) throw listErr
      const verified = data.totp.filter((f) => f.status === 'verified')
      setEnabled(verified.length > 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.unexpected'))
    } finally {
      setLoading(false)
    }
  }, [supabase, t])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startEnroll = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (enrollErr) throw enrollErr
      setFactorId(data.id)
      setQr(data.totp.qr_code)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.unexpected'))
    } finally {
      setBusy(false)
    }
  }

  const verifyEnroll = async () => {
    if (!factorId || !code.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
      if (chErr) throw chErr
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      })
      if (verErr) throw verErr
      await logActivity(supabase, userId, { action: '2fa_enroll' })
      setQr(null)
      setFactorId(null)
      setCode('')
      setEnabled(true)
      setMessage(t('security.2fa.active'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.unexpected'))
    } finally {
      setBusy(false)
    }
  }

  const disable2fa = async () => {
    setBusy(true)
    setError(null)
    try {
      const { data, error: listErr } = await supabase.auth.mfa.listFactors()
      if (listErr) throw listErr
      for (const f of data.totp) {
        if (f.status === 'verified') {
          await supabase.auth.mfa.unenroll({ factorId: f.id })
        }
      }
      await logActivity(supabase, userId, { action: '2fa_unenroll' })
      setEnabled(false)
      setMessage(t('security.2fa.inactive'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.unexpected'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> …
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {enabled ? (
          <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden />
        ) : (
          <Shield className="h-5 w-5 text-muted" aria-hidden />
        )}
        <div>
          <p className="text-sm font-medium text-main">{t('security.2fa.title')}</p>
          <p className="text-xs text-muted">{t('security.2fa.desc')}</p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
      )}
      {message && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400" role="status">{message}</p>
      )}

      {enabled ? (
        <button
          type="button"
          onClick={disable2fa}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-500/30 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
          {t('security.2fa.disable')}
        </button>
      ) : qr ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">{t('security.2fa.scan')}</p>
          {qr.startsWith('data:') || qr.startsWith('http') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR Code 2FA" className="mx-auto h-40 w-40 rounded-lg border border-border bg-white p-2" />
          ) : (
            <div className="text-xs break-all font-mono bg-background border border-border rounded-lg p-3">{qr}</div>
          )}
          <label className="block text-xs font-medium text-muted">{t('security.2fa.code')}</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-main"
          />
          <button
            type="button"
            onClick={verifyEnroll}
            disabled={busy || !code.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('security.2fa.verify')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEnroll}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          {t('security.2fa.enable')}
        </button>
      )}
    </div>
  )
}
