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

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Visão geral',
  '/revenues': 'Entradas',
  '/expenses': 'Saídas',
  '/credit-cards': 'Cartões de crédito',
  '/subscriptions': 'Assinaturas',
  '/income-sources': 'Fontes de renda',
  '/goals': 'Cofres',
  '/projections': 'Orçamento',
  '/reports': 'Relatórios',
  '/import-statement': 'Importar extrato',
  '/import-history': 'Histórico de importações',
  '/settings': 'Cadastros',
  '/profile': 'Perfil',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const base = '/' + pathname.split('/')[1]
  return PAGE_TITLES[base] ?? ''
}

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
  const [loggingOut, setLoggingOut] = useState(false)
  const pronoun = useGreetingPronoun()

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

      if (profile?.full_name) setDisplayName(profile.full_name.split(' ')[0])
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
      if (profile?.plan_status) setPlanStatus(profile.plan_status)
      if (profile?.trial_ends_at) setTrialEndsAt(profile.trial_ends_at)
    }
    loadProfile()
  }, [supabase])

  const initials = displayName ? displayName[0].toUpperCase() : '?'
  const isDark = resolvedTheme === 'dark'
  const pageTitle = getPageTitle(pathname)

  const trialDaysLeft =
    planStatus === 'trial' && trialEndsAt
      ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000)
      : null

  const trialBadgeLabel =
    trialDaysLeft === null
      ? null
      : trialDaysLeft < 1
        ? 'Último dia'
        : trialDaysLeft === 1
          ? '1 dia restante'
          : `${trialDaysLeft} dias restantes`

  const showTrialBadge =
    trialBadgeLabel !== null && trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft <= 7

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border glass-topbar">
      <div className="h-14 flex items-center justify-between px-5 gap-4 transition-colors">

        {/* ── Left: page title ── */}
        <div className="min-w-0 flex-1">
          {pageTitle && (
            <h1 className="text-sm font-semibold text-main truncate">{pageTitle}</h1>
          )}
        </div>

        {/* ── Right: actions ── */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Trial badge */}
          {showTrialBadge && (
            <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20 mr-1">
              {trialBadgeLabel}
            </span>
          )}

          {/* Quick add */}
          <button
            onClick={() => setQuickAddOpen(true)}
            title="Novo lançamento rápido"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-brand text-white hover:bg-brand/90 active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lançar</span>
          </button>

          <div className="max-lg:hidden w-px h-5 bg-border mx-1.5" />

          {/* Theme toggle — oculto no mobile (está no BottomNav "Mais") */}
          {mounted && (
            <button
              onClick={() => {
                document.documentElement.classList.add('theme-transition')
                setTheme(isDark ? 'light' : 'dark')
                setTimeout(
                  () => document.documentElement.classList.remove('theme-transition'),
                  500,
                )
              }}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
              className="max-lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {/* Privacy toggle — oculto no mobile */}
          <button
            onClick={togglePrivacyMode}
            title={isPrivacyMode ? 'Mostrar valores' : 'Ocultar valores'}
            className={`max-lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors ${
              isPrivacyMode
                ? 'bg-brand/15 text-brand'
                : 'text-muted hover:text-main hover:bg-background'
            }`}
          >
            {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          <div className="max-lg:hidden w-px h-5 bg-border mx-1.5" />

          {/* Profile avatar — oculto no mobile */}
          <Link
            href="/profile"
            title={`Perfil — ${displayName || pronoun}`}
            className="max-lg:hidden flex items-center gap-2 group"
          >
            <div className="hidden sm:block text-right leading-none">
              <p className="text-xs font-medium text-main group-hover:text-brand transition-colors">
                {displayName || pronoun}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full border border-border overflow-hidden bg-background flex items-center justify-center shrink-0 group-hover:border-brand/50 transition-colors">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-brand">{initials}</span>
              )}
            </div>
          </Link>

          {/* Logout — oculto no mobile (está no BottomNav "Mais") */}
          <button
            onClick={() => setShowLogoutModal(true)}
            title="Encerrar sessão"
            className="max-lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

      {/* ── Logout confirmation modal ── */}
      {showLogoutModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-backdrop-enter">
            <div className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-2xl p-6 space-y-4 animate-modal-enter">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
                  <DoorOpen className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-main">Deixando a Mansão?</h2>
                  <p className="text-xs text-muted mt-0.5">Sua sessão será encerrada.</p>
                </div>
              </div>

              <p className="text-sm text-muted leading-relaxed">
                Deseja realmente sair, {displayName || 'patrão'}? Estarei aqui aguardando o seu
                retorno para cuidar das finanças.
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  disabled={loggingOut}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background disabled:opacity-50 transition-colors"
                >
                  Permanecer
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loggingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saindo…
                    </>
                  ) : (
                    'Sair'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  )
}
