'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { usePrivacy } from '@/lib/privacyContext'
import { LogOut, Sun, Moon, Eye, EyeOff, Loader2, DoorOpen, Plus } from 'lucide-react'
import { useGreetingPronoun } from '@/lib/greeting'
import QuickAddModal from '@/components/QuickAddModal'

const mainNav = [
  { label: 'Patrimônio', href: '/dashboard' },
  { label: 'Relatórios', href: '/reports' },
  { label: 'Cadastros', href: '/settings' },
]

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()
  const [mounted, setMounted] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [planStatus, setPlanStatus] = useState<string>('trial')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const pronoun = useGreetingPronoun()
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const loadProfile = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const emailName = userData.user.email?.split('@')[0] || ''
      setDisplayName(emailName.charAt(0).toUpperCase() + emailName.slice(1))

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, plan_status, trial_ends_at')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (profile?.full_name) {
        setDisplayName(profile.full_name.split(' ')[0])
      }
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url)
      }
      if (profile?.plan_status) {
        setPlanStatus(profile.plan_status)
      }
      if (profile?.trial_ends_at) {
        setTrialEndsAt(profile.trial_ends_at)
      }
    }
    loadProfile()
  }, [supabase])

  const initials = displayName ? displayName[0].toUpperCase() : '?'
  const isDark = resolvedTheme === 'dark'

  const trialDaysLeft = planStatus === 'trial' && trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000)
    : null
  const trialBadgeLabel =
    trialDaysLeft === null ? null
    : trialDaysLeft < 1 ? 'Último dia de teste'
    : trialDaysLeft === 1 ? '1 dia de teste grátis'
    : `${trialDaysLeft} dias de teste grátis`

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border glass-topbar">
      <div className="h-14 flex items-center justify-between px-5 transition-colors">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 border border-brand/30 text-sm">
              🎩
            </span>
            <span className="hidden sm:inline text-main">
              Alfred <span className="text-brand font-normal">Financeiro</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {mainNav.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    active
                      ? 'bg-brand/15 text-brand'
                      : 'text-muted hover:text-main hover:bg-background'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Botão lançamento rápido */}
          <button
            onClick={() => setQuickAddOpen(true)}
            title="Novo lançamento rápido"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-brand text-white hover:opacity-90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lançar</span>
          </button>

          <div className="w-px h-6 bg-border mx-0.5" />

          {/* Trial badge - só exibe quando restam 7 dias ou menos */}
          {trialBadgeLabel && trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft <= 7 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-brand/15 text-brand ring-1 ring-inset ring-brand/30">
              {trialBadgeLabel}
            </span>
          )}

          <div className="w-px h-6 bg-border mx-0.5" />

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => {
                document.documentElement.classList.add('theme-transition')
                setTheme(isDark ? 'light' : 'dark')
                setTimeout(() => document.documentElement.classList.remove('theme-transition'), 500)
              }}
              title="Ajustar iluminação, senhor"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {/* Privacy toggle */}
          <button
            onClick={togglePrivacyMode}
            title="Modo discrição"
            className={`inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors ${
              isPrivacyMode
                ? 'bg-brand/15 text-brand'
                : 'text-muted hover:text-main hover:bg-background'
            }`}
          >
            {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Profile */}
          <Link href="/profile" className="flex items-center gap-2.5 group">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-muted group-hover:text-main transition-colors">
                À sua disposição
              </p>
              <p className="text-sm font-medium text-main">{displayName || pronoun}</p>
            </div>
            <div className="h-8 w-8 rounded-full border border-brand/30 overflow-hidden bg-background flex items-center justify-center shrink-0 glow-hover">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-brand">{initials}</span>
              )}
            </div>
          </Link>

          <button
            onClick={() => setShowLogoutModal(true)}
            title="Encerrar sessão"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

      {/* Logout modal */}
      {showLogoutModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-backdrop-enter">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-2xl p-6 space-y-4 animate-modal-enter">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
                <DoorOpen className="h-5 w-5 text-brand" />
              </div>
              <h2 className="text-lg font-semibold text-main">Deixando a Mansão?</h2>
            </div>

            <p className="text-sm text-muted leading-relaxed">
              Deseja realmente encerrar a sua sessão, patrão? Estarei aqui aguardando o seu retorno para cuidar das finanças.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background disabled:opacity-50 transition-colors"
              >
                Permanecer
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loggingOut ? <><Loader2 className="h-4 w-4 animate-spin" /> Saindo...</> : 'Sim, Sair'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  )
}
