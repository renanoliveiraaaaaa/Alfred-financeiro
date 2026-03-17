'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabaseClient'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createSupabaseClient()

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
        if (data.session) {
          router.push('/dashboard')
          router.refresh()
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.session) {
          router.push('/dashboard')
          router.refresh()
        } else if (data.user) {
          setError('Sua conta foi criada com distinção, senhor. Verifique seu e-mail para confirmar o cadastro.')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-manor-950 px-4 transition-colors">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-manor-900 rounded-2xl border border-gray-200 dark:border-manor-800 shadow-lg dark:shadow-2xl dark:shadow-black/50 transition-colors">
        <div className="text-center animate-stagger-up" style={{ animationDelay: '0ms' }}>
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gold-100 dark:bg-gold-500/10 border border-gold-200 dark:border-gold-500/30 mb-4">
            <span className="text-3xl">🎩</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Alfred Financeiro
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-silver">
            {isLogin
              ? 'Bem-vindo de volta à Mansão, senhor.'
              : 'Permita-me preparar sua conta, senhor.'}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleAuth}>
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300 animate-fade-in">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="animate-stagger-up" style={{ animationDelay: '80ms' }}>
              <label htmlFor="email" className="block text-xs font-medium text-gray-500 dark:text-silver-dark uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="animate-stagger-up" style={{ animationDelay: '160ms' }}>
              <label htmlFor="password" className="block text-xs font-medium text-gray-500 dark:text-silver-dark uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="animate-stagger-up" style={{ animationDelay: '240ms' }}>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium bg-gold-600 dark:bg-gold-500 text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-manor-900 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Um momento, senhor...' : isLogin ? 'Entrar' : 'Criar conta'}
            </button>
          </div>

          <div className="text-center animate-stagger-up" style={{ animationDelay: '320ms' }}>
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null) }}
              className="text-sm text-gold-600 dark:text-gold-500 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
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
