'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { useI18n } from '@/lib/i18n'
import { resolveAuthErrorKey } from '@/lib/authErrorI18n'

const inputClass =
  'w-full border-0 border-b border-slate-500/40 bg-transparent px-0 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-0 transition-colors rounded-none'

type Props = {
  initialAuthenticated: boolean
  urlError: string | null
}

export default function ResetPasswordClient({ initialAuthenticated, urlError }: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseClient()

  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(initialAuthenticated)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    const allow = () => {
      if (!cancelled) setAllowed(true)
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (
        event === 'PASSWORD_RECOVERY' ||
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION'
      ) {
        allow()
      }
    })

    ;(async () => {
      const queryError = urlError ?? searchParams.get('error')
      if (queryError) {
        setReady(true)
        return
      }

      if (initialAuthenticated) {
        setReady(true)
        return
      }

      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      if (tokenHash && type === 'recovery') {
        const { error: otpErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })
        if (!otpErr) allow()
      }

      const code = searchParams.get('code')
      if (code) {
        const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code)
        if (!codeErr) allow()
      }

      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      if (hash) {
        const hashParams = new URLSearchParams(hash)
        if (hashParams.get('type') === 'recovery' || hashParams.get('access_token')) {
          allow()
        }
      }

      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) allow()

      // Aguarda evento PASSWORD_RECOVERY após parse do hash
      await new Promise((r) => setTimeout(r, 500))
      if (cancelled) return

      const { data: retryUser } = await supabase.auth.getUser()
      if (retryUser.user) allow()

      if (!cancelled) setReady(true)
    })()

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [supabase, searchParams, urlError, initialAuthenticated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('auth.error.weak')
      return
    }
    if (password !== confirm) {
      setError('auth.error.passwordMismatch')
      return
    }

    setLoading(true)
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) throw updErr
      setDone(true)
      await supabase.auth.signOut()
      setTimeout(() => router.replace('/'), 2500)
    } catch (err: unknown) {
      setError(resolveAuthErrorKey(err))
    } finally {
      setLoading(false)
    }
  }

  const invalidMessage = (() => {
    const code = urlError ?? searchParams.get('error')
    if (code === 'exchange') return t('auth.reset.errorExchange')
    if (code === 'missing_code') return t('auth.reset.errorMissingCode')
    return t('auth.reset.invalidBody')
  })()

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
        <h1 className="text-xl font-semibold text-slate-100">{t('auth.reset.invalidTitle')}</h1>
        <p className="text-sm text-slate-400 max-w-md">{invalidMessage}</p>
        <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">
          {t('auth.reset.backLogin')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/45 p-8 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-400/80 text-center">
          {t('auth.digitalVault')}
        </p>
        <h1 className="mt-2 text-center text-lg font-semibold text-slate-100">
          {done ? t('auth.reset.doneTitle') : t('auth.reset.title')}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          {done ? t('auth.reset.doneBody') : t('auth.reset.subtitle')}
        </p>

        {!done ? (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {t(error) !== error ? t(error) : error}
              </div>
            )}
            <div>
              <label htmlFor="new-password" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                {t('auth.reset.newPassword')}
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                {t('auth.reset.confirmPassword')}
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={inputClass}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-800 to-emerald-950 py-3.5 text-sm font-semibold text-white shadow-xl disabled:opacity-50"
            >
              {loading ? t('auth.loading') : t('auth.reset.submit')}
            </button>
          </form>
        ) : (
          <p className="mt-6 text-center text-sm text-emerald-200/90">{t('auth.reset.redirecting')}</p>
        )}

        {!done && (
          <p className="mt-4 text-center">
            <Link href="/" className="text-xs text-emerald-400 hover:text-emerald-300">
              {t('auth.reset.backLogin')}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
