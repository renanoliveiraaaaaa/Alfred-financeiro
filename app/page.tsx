'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { getLastUser, setLastUser, clearLastUser, maskEmail, type LastUser } from '@/lib/lastUserStorage'
import { User } from 'lucide-react'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('O')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUser, setLastUserState] = useState<LastUser | null>(null)
  const [showEmailForm, setShowEmailForm] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { setTheme } = useTheme()

  // Forçar tema claro na página de login
  useEffect(() => {
    setTheme('light')
  }, [setTheme])

  // Carregar último usuário ao montar
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
    setLoading(true)
    setError(null)

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas.')
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.session && data.user) {
          // Buscar perfil para avatar e nome
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', data.user.id)
            .maybeSingle()

          setLastUser({
            email: data.user.email ?? email,
            fullName: profile?.full_name ?? null,
            avatarUrl: profile?.avatar_url ?? null,
          })

          router.push('/dashboard')
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
          router.push('/dashboard')
          router.refresh()
        } else if (data.user) {
          setError('Sua conta foi criada com distinção. Verifique seu e-mail para confirmar o cadastro.')
        }
      }
    } catch (err: any) {
      console.error('Erro de autenticação Supabase:', err)
      if (err?.message === 'Failed to fetch') {
        setError('Não foi possível estabelecer conexão com o servidor. Verifique suas credenciais de ambiente e a disponibilidade do serviço.')
      } else {
        setError(err?.message || 'Falha na autenticação. Tente novamente.')
      }
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
  }

  const displayName = lastUser?.fullName
    ? lastUser.fullName.split(' ').map((w) => w.toUpperCase()).join(' ')
    : lastUser?.email
      ? lastUser.email.split('@')[0].toUpperCase()
      : ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 transition-colors">
      <div className="max-w-md w-full space-y-8 p-8 bg-surface rounded-2xl border border-border shadow-lg transition-colors">
        <div className="text-center animate-stagger-up" style={{ animationDelay: '0ms' }}>
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-brand/15 border border-brand/30 mb-4">
            <span className="text-3xl">🎩</span>
          </div>
          <h1 className="text-2xl font-semibold text-main tracking-tight">
            Alfred Financeiro
          </h1>
          <p className="mt-2 text-sm text-muted">
            {lastUser && !showEmailForm
              ? `Olá, ${displayName}. Que bom te ver de novo!`
              : isLogin
                ? 'Bem-vindo de volta à Mansão.'
                : 'Permita-me preparar sua conta.'}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleAuth}>
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300 animate-fade-in">
              {error}
            </div>
          )}

          {/* Box do usuário lembrado */}
          {lastUser && !showEmailForm && isLogin ? (
            <div className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full border-2 border-brand/30 overflow-hidden bg-border flex items-center justify-center shrink-0">
                  {lastUser.avatarUrl ? (
                    <img src={lastUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-0.5">
                    Email
                  </label>
                  <p className="text-sm font-medium text-main truncate">{maskEmail(lastUser.email)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleTrocarConta}
                  className="text-xs font-medium text-brand hover:opacity-80 transition-colors shrink-0"
                >
                  Trocar de conta
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-stagger-up" style={{ animationDelay: '80ms' }}>
              <label htmlFor="email" className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className="block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <div className="animate-stagger-up" style={{ animationDelay: '160ms' }}>
            <label htmlFor="password" className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              {lastUser && !showEmailForm ? 'Digite sua senha' : 'Senha'}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
              className="block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {!isLogin && (
            <div className="animate-stagger-up" style={{ animationDelay: '200ms' }}>
              <label htmlFor="gender" className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Gênero <span className="text-red-400">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                required
                value={gender}
                onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'O')}
                className="block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
              >
                <option value="O">Prefiro não informar / Outro</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          )}

          <div className="animate-stagger-up" style={{ animationDelay: '240ms' }}>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 transition-colors"
            >
              {loading ? 'Um momento...' : isLogin ? 'Continuar' : 'Criar conta'}
            </button>
          </div>

          <div className="text-center animate-stagger-up" style={{ animationDelay: '320ms' }}>
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); setShowEmailForm(true) }}
              className="text-sm text-brand hover:opacity-80 transition-colors"
            >
              {isLogin
                ? 'Ainda não possui conta? Registrar-se'
                : 'Já possui conta? Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
