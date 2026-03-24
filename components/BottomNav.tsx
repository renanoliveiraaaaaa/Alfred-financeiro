'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from 'next-themes'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { usePrivacy } from '@/lib/privacyContext'
import {
  LayoutDashboard, TrendingUp, Receipt, CreditCard, MoreHorizontal,
  RefreshCw, Wallet, PiggyBank, Settings, UserCircle,
  Target, BarChart3, FileUp, History, X,
  Sun, Moon, Eye, EyeOff, LogOut, Loader2, DoorOpen,
} from 'lucide-react'

function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

const mainItems = [
  { href: '/dashboard', label: 'Início', Icon: LayoutDashboard },
  { href: '/revenues', label: 'Entradas', Icon: TrendingUp },
  { href: '/expenses', label: 'Saídas', Icon: Receipt },
  { href: '/credit-cards', label: 'Cartões', Icon: CreditCard },
]

const moreItems = [
  { href: '/subscriptions', label: 'Assinaturas', Icon: RefreshCw },
  { href: '/income-sources', label: 'Fontes de renda', Icon: Wallet },
  { href: '/goals', label: 'Cofres', Icon: PiggyBank },
  { href: '/projections', label: 'Orçamento', Icon: Target },
  { href: '/reports', label: 'Relatórios', Icon: BarChart3 },
  { href: '/import-statement', label: 'Importar extrato', Icon: FileUp },
  { href: '/import-history', label: 'Histórico', Icon: History },
  { href: '/settings', label: 'Cadastros', Icon: Settings },
  { href: '/profile', label: 'Perfil', Icon: UserCircle },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { resolvedTheme, setTheme } = useTheme()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const isDark = resolvedTheme === 'dark'
  const moreActive = moreItems.some((item) => isActive(item.href, pathname))

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleMoreLink = () => setSheetOpen(false)

  return (
    <>
      {/* ── Bottom Nav Bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[55] bg-surface/95 backdrop-blur-lg border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch h-16">
          {mainItems.map(({ href, label, Icon }) => {
            const active = isActive(href, pathname)
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                  active ? 'text-brand' : 'text-muted'
                }`}
              >
                {active && (
                  <span className="absolute top-0 w-8 h-0.5 rounded-full bg-brand -translate-y-px" />
                )}
                <Icon className="h-6 w-6 shrink-0" />
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-brand' : 'text-muted'}`}>
                  {label}
                </span>
              </Link>
            )
          })}

          {/* Mais */}
          <button
            onClick={() => setSheetOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
              moreActive ? 'text-brand' : 'text-muted'
            }`}
          >
            <MoreHorizontal className="h-6 w-6 shrink-0" />
            <span className={`text-[10px] font-medium leading-none ${moreActive ? 'text-brand' : 'text-muted'}`}>
              Mais
            </span>
          </button>
        </div>
      </nav>

      {/* ── Bottom Sheet (Mais) ── */}
      {sheetOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-[61] bg-surface rounded-t-2xl border-t border-border shadow-2xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <span className="text-sm font-semibold text-main">Menu</span>
              <button
                onClick={() => setSheetOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav items grid */}
            <div className="px-4 py-3 grid grid-cols-3 gap-2">
              {moreItems.map(({ href, label, Icon }) => {
                const active = isActive(href, pathname)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={handleMoreLink}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors ${
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'text-muted hover:bg-background hover:text-main'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Ações rápidas */}
            <div className="px-4 pb-2 flex items-center gap-2 border-t border-border pt-3">
              {/* Theme toggle */}
              <button
                onClick={() => {
                  document.documentElement.classList.add('theme-transition')
                  setTheme(isDark ? 'light' : 'dark')
                  setTimeout(() => document.documentElement.classList.remove('theme-transition'), 500)
                }}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-sm font-medium text-muted hover:text-main hover:bg-background transition-colors"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>{isDark ? 'Claro' : 'Escuro'}</span>
              </button>

              {/* Privacy toggle */}
              <button
                onClick={togglePrivacyMode}
                className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition-colors ${
                  isPrivacyMode
                    ? 'border-brand/30 bg-brand/10 text-brand'
                    : 'border-border text-muted hover:text-main hover:bg-background'
                }`}
              >
                {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{isPrivacyMode ? 'Revelar' : 'Ocultar'}</span>
              </button>

              {/* Logout */}
              <button
                onClick={() => { setSheetOpen(false); setShowLogoutModal(true) }}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-sm font-medium text-muted hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}

      {/* ── Logout modal ── */}
      {showLogoutModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
                <DoorOpen className="h-5 w-5 text-brand" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-main">Sair do Alfred?</h2>
                <p className="text-xs text-muted mt-0.5">Sua sessão será encerrada.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-muted hover:bg-background disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loggingOut ? <><Loader2 className="h-4 w-4 animate-spin" />Saindo…</> : 'Sair'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
