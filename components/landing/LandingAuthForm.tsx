'use client'

import { User } from 'lucide-react'
import { maskEmail, type LastUser } from '@/lib/lastUserStorage'

export type LandingAuthFormProps = {
  isLogin: boolean
  email: string
  password: string
  gender: 'M' | 'F' | 'O'
  loading: boolean
  error: string | null
  signupEmailPending: boolean
  lastUser: LastUser | null
  showEmailForm: boolean
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onGenderChange: (v: 'M' | 'F' | 'O') => void
  onSubmit: (e: React.FormEvent) => void
  onTrocarConta: () => void
  onGoToLoginAfterSignup: () => void
  onTabAccess: () => void
  onTabInvite: () => void
}

const inputClass =
  'w-full border-0 border-b border-slate-500/40 bg-transparent px-0 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-0 transition-colors rounded-none'

const selectClass =
  'w-full rounded-lg border border-slate-500/30 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400/80 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-colors'

export default function LandingAuthForm({
  isLogin,
  email,
  password,
  gender,
  loading,
  error,
  signupEmailPending,
  lastUser,
  showEmailForm,
  onEmailChange,
  onPasswordChange,
  onGenderChange,
  onSubmit,
  onTrocarConta,
  onGoToLoginAfterSignup,
  onTabAccess,
  onTabInvite,
}: LandingAuthFormProps) {
  const displayName = lastUser?.fullName
    ? lastUser.fullName.split(' ').map((w) => w.toUpperCase()).join(' ')
    : lastUser?.email
      ? lastUser.email.split('@')[0].toUpperCase()
      : ''

  return (
    <div className="w-full max-w-md">
      <div
        className="rounded-2xl border border-white/10 bg-slate-950/45 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-500 ease-out"
        style={{
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.06) inset, 0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-400/80">
            Cofre digital
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {lastUser && !showEmailForm
              ? `Olá, ${displayName}. Que bom te ver de novo.`
              : !isLogin && signupEmailPending
                ? 'Quase lá — confirme seu e-mail para entrar.'
                : isLogin
                  ? 'Bem-vindo de volta à Mansão.'
                  : 'Permita-me preparar sua conta.'}
          </p>
        </div>

        <div className="mb-6 flex rounded-xl border border-white/10 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={onTabAccess}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
              isLogin
                ? 'bg-gradient-to-b from-emerald-600/90 to-emerald-800/90 text-white shadow-lg shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Acessar
          </button>
          <button
            type="button"
            onClick={onTabInvite}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
              !isLogin
                ? 'bg-gradient-to-b from-emerald-600/90 to-emerald-800/90 text-white shadow-lg shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Solicitar convite
          </button>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          {error && (
            <div className="animate-fade-in rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {!isLogin && signupEmailPending && (
            <div className="animate-fade-in space-y-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
              <p className="font-medium">Conta criada com sucesso</p>
              <p className="leading-relaxed text-emerald-200/90">
                Enviamos um link de confirmação para{' '}
                <span className="font-medium text-white">{email}</span>. Abra o e-mail e clique no link
                para ativar a conta; em seguida poderá entrar com e-mail e senha.
              </p>
              <button
                type="button"
                onClick={onGoToLoginAfterSignup}
                className="mt-1 w-full rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-800 to-emerald-950 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-950/40 transition-all hover:brightness-110 active:scale-[0.99]"
              >
                Ir para o login
              </button>
            </div>
          )}

          {lastUser && !showEmailForm && isLogin ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-500/30 bg-slate-900">
                  {lastUser.avatarUrl ? (
                    <img src={lastUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label className="mb-0.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                    E-mail
                  </label>
                  <p className="truncate text-sm font-medium text-slate-100">{maskEmail(lastUser.email)}</p>
                </div>
                <button
                  type="button"
                  onClick={onTrocarConta}
                  className="shrink-0 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  Trocar de conta
                </button>
              </div>
            </div>
          ) : !signupEmailPending ? (
            <div className="transition-all">
              <label htmlFor="email" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className={inputClass}
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
              />
            </div>
          ) : null}

          {!signupEmailPending && (
            <div className="transition-all">
              <label htmlFor="password" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                {lastUser && !showEmailForm ? 'Digite sua senha' : 'Senha'}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                className={inputClass}
                placeholder="••••••••"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
            </div>
          )}

          {!isLogin && !signupEmailPending && (
            <div className="transition-all">
              <label htmlFor="gender" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Gênero <span className="text-red-400">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                required
                value={gender}
                onChange={(e) => onGenderChange(e.target.value as 'M' | 'F' | 'O')}
                className={selectClass}
              >
                <option value="O">Prefiro não informar / Outro</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          )}

          {!signupEmailPending && (
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-800 to-emerald-950 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-950/50 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Um momento…' : isLogin ? 'Entrar na Mansão' : 'Solicitar acesso'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
