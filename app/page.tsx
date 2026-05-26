'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { getLastUser, setLastUser, clearLastUser, type LastUser } from '@/lib/lastUserStorage'
import LandingHero from '@/components/landing/LandingHero'
import LandingAuthForm from '@/components/landing/LandingAuthForm'
import { useI18n } from '@/lib/i18n'
import { resolveAuthErrorKey } from '@/lib/authErrorI18n'

function safeRedirectPath(path: string | null): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null
  return path
}

export default function Home() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const [booting, setBooting] = useState(true)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('O')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupEmailPending, setSignupEmailPending] = useState(false)
  const [lastUser, setLastUserState] = useState<LastUser | null>(null)
  const [showEmailForm, setShowEmailForm] = useState(true)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()
        if (cancelled) return
        const isAdmin = profile?.role === 'admin'
        const afterLogin =
          safeRedirectPath(redirectParam) ?? (isAdmin ? '/admin/dashboard' : '/dashboard')
        router.replace(afterLogin)
        router.refresh()
        return
      }

      setBooting(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, router, redirectParam])

  useEffect(() => {
    const stored = getLastUser()
    if (stored && isLogin) {
      setLastUserState(stored)
      setEmail(stored.email)
      setShowEmailForm(false)
    } else {
      setShowEmailForm(true)
    }
  }, [isLogin])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLogin && signupEmailPending) return

    setLoading(true)
    setError(null)

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('auth.error.env')
      }

      if (forgotMode) {
        const targetEmail = (lastUser && !showEmailForm ? lastUser.email : email).trim()
        if (!targetEmail) {
          setError('auth.error.invalid')
          return
        }
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '')
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: `${appUrl}/auth/callback`,
        })
        if (resetErr) throw resetErr
        setForgotSent(true)
        return
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.session && data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, role')
            .eq('id', data.user.id)
            .maybeSingle()

          setLastUser({
            email: data.user.email ?? email,
            fullName: profile?.full_name ?? null,
            avatarUrl: profile?.avatar_url ?? null,
          })

          const isAdmin = profile?.role === 'admin'
          const afterLogin =
            safeRedirectPath(redirectParam) ?? (isAdmin ? '/admin/dashboard' : '/dashboard')
          router.push(afterLogin)
          router.refresh()
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { gender, app_theme: 'normal' } },
        })
        if (error) throw error
        if (data.session) {
          const target = safeRedirectPath(redirectParam) ?? '/dashboard'
          router.push(target)
          router.refresh()
        } else if (data.user) {
          setSignupEmailPending(true)
          setPassword('')
        }
      }
    } catch (err: unknown) {
      console.error('Auth error:', err)
      setError(resolveAuthErrorKey(err))
    } finally {
      setLoading(false)
    }
  }

  const handleTrocarConta = () => {
    clearLastUser()
    setLastUserState(null)
    setEmail('')
    setShowEmailForm(true)
    setError(null)
    setSignupEmailPending(false)
  }

  const goToLoginAfterSignup = () => {
    setIsLogin(true)
    setSignupEmailPending(false)
    setError(null)
    setPassword('')
  }

  const switchToRegister = () => {
    setIsLogin(false)
    setForgotMode(false)
    setForgotSent(false)
    setError(null)
    setSignupEmailPending(false)
    setShowEmailForm(true)
  }

  const switchToLogin = () => {
    setIsLogin(true)
    setForgotMode(false)
    setForgotSent(false)
    setError(null)
    setSignupEmailPending(false)
  }

  const openForgotPassword = () => {
    setIsLogin(true)
    setForgotMode(true)
    setForgotSent(false)
    setError(null)
    setSignupEmailPending(false)
  }

  const backFromForgot = () => {
    setForgotMode(false)
    setForgotSent(false)
    setError(null)
  }

  if (booting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400"
          aria-hidden
        />
        <span className="sr-only">{t('auth.bootLoading')}</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] h-[100dvh] flex-col overflow-hidden bg-slate-950 lg:flex-row">
      {/* Vitrine */}
      <section className="relative flex min-h-0 flex-1 flex-col bg-slate-950 lg:w-1/2 lg:max-w-[50%]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.18),transparent_55%)]"
          aria-hidden
        />
        <LandingHero />
      </section>

      {/* Porta do cofre */}
      <section className="relative flex flex-1 flex-col items-center justify-center border-t border-white/5 bg-slate-900/40 px-6 py-10 backdrop-blur-xl lg:w-1/2 lg:max-w-[50%] lg:border-l lg:border-t-0 lg:px-10">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(255,255,255,0.06),transparent_50%)]"
          aria-hidden
        />
        <div
          className="relative z-10 w-full max-w-lg animate-stagger-up"
          style={{ animationDelay: '100ms' }}
        >
          <LandingAuthForm
            isLogin={isLogin}
            email={email}
            password={password}
            gender={gender}
            loading={loading}
            error={error}
            signupEmailPending={signupEmailPending}
            lastUser={lastUser}
            showEmailForm={showEmailForm}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onGenderChange={setGender}
            onSubmit={handleAuth}
            onTrocarConta={handleTrocarConta}
            onGoToLoginAfterSignup={goToLoginAfterSignup}
            onTabAccess={switchToLogin}
            onTabInvite={switchToRegister}
            forgotMode={forgotMode}
            forgotSent={forgotSent}
            onForgotClick={openForgotPassword}
            onBackFromForgot={backFromForgot}
          />
        </div>
      </section>
    </div>
  )
}
