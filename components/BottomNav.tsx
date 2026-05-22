'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from 'next-themes'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { usePrivacy } from '@/lib/privacyContext'
import { useUserPreferences } from '@/lib/userPreferencesContext'
import { useI18n } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import LogoutModal from '@/components/LogoutModal'
import {
  LayoutDashboard, TrendingUp, Receipt, CreditCard, MoreHorizontal,
  RefreshCw, Wallet, PiggyBank, Settings, UserCircle,
  Target, BarChart3, FileUp, History, X,
  Sun, Moon, Eye, EyeOff, LogOut,
} from 'lucide-react'

function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

const mainItems = [
  { href: '/dashboard', label: 'nav.home', Icon: LayoutDashboard },
  { href: '/revenues', label: 'nav.revenues', Icon: TrendingUp },
  { href: '/expenses', label: 'nav.expenses', Icon: Receipt },
  { href: '/credit-cards', label: 'nav.creditCards', Icon: CreditCard },
]

function getMoreItems(isBusiness: boolean) {
  return [
    { href: '/subscriptions', label: isBusiness ? 'nav.businessSubscriptions' : 'nav.more', Icon: RefreshCw },
    { href: '/income-sources', label: isBusiness ? 'nav.businessIncomeSources' : 'nav.incomeSources', Icon: Wallet },
    { href: '/goals', label: isBusiness ? 'nav.businessGoals' : 'nav.goals', Icon: PiggyBank },
    { href: '/projections', label: 'nav.projections', Icon: Target },
    { href: '/reports', label: 'nav.reports', Icon: BarChart3 },
    { href: '/import-statement', label: 'nav.importStatement', Icon: FileUp },
    { href: '/import-history', label: 'nav.importHistory', Icon: History },
    { href: '/settings', label: 'nav.settings', Icon: Settings },
    { href: '/profile', label: 'nav.profile', Icon: UserCircle },
  ]
}

export default function BottomNav() {
  const { t } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { resolvedTheme, setTheme } = useTheme()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()

  const { isAdmin, activeOrgType } = useUserPreferences()
  const isBusiness = activeOrgType === 'business'
  const moreItems = getMoreItems(isBusiness)
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

  const mainNavLabel = (label: string) => {
    if (isBusiness && label === 'nav.revenues') return t('nav.businessRevenues')
    if (isBusiness && label === 'nav.expenses') return t('nav.businessExpenses')
    return t(label)
  }

  return (
    <>
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
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                  active ? 'text-brand' : 'text-muted'
                }`}
              >
                {active && (
                  <span className="absolute top-0 w-8 h-0.5 rounded-full bg-brand -translate-y-px" />
                )}
                <Icon className="h-6 w-6 shrink-0" />
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-brand' : 'text-muted'}`}>
                  {mainNavLabel(label)}
                </span>
              </Link>
            )
          })}

          <button
            onClick={() => setSheetOpen(true)}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
              moreActive ? 'text-brand' : 'text-muted'
            }`}
          >
            <MoreHorizontal className="h-6 w-6 shrink-0" />
            <span className={`text-[10px] font-medium leading-none ${moreActive ? 'text-brand' : 'text-muted'}`}>
              {t('nav.more')}
            </span>
          </button>
        </div>
      </nav>

      {sheetOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />

          <div
            className="fixed bottom-0 left-0 right-0 z-[61] bg-surface rounded-t-2xl border-t border-border shadow-2xl max-h-[85vh] overflow-y-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <span className="text-sm font-semibold text-main">{t('bottomNav.menu')}</span>
              <button
                onClick={() => setSheetOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border space-y-3">
              <div>
                <p className="text-xs font-medium text-muted mb-2">{t('bottomNav.context')}</p>
                <OrganizationSwitcher variant="sidebar" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted mb-2">{t('bottomNav.language')}</p>
                <LanguageSwitcher />
              </div>
            </div>

            <div className="px-4 py-3 grid grid-cols-3 gap-2">
              {moreItems.map(({ href, label, Icon }) => {
                const active = isActive(href, pathname)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={handleMoreLink}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors min-h-[44px] ${
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'text-muted hover:bg-background hover:text-main'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-[10px] font-medium text-center leading-tight">{t(label)}</span>
                  </Link>
                )
              })}
            </div>

            {isAdmin ? (
              <div className="px-4 pb-2">
                <Link
                  href="/admin/dashboard"
                  onClick={handleMoreLink}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] dark:bg-amber-500/10 px-3 py-3 text-sm font-semibold text-amber-950 dark:text-amber-100 transition-colors hover:bg-amber-500/15 min-h-[44px] ${
                    isActive('/admin/dashboard', pathname) ? 'ring-1 ring-amber-500/40' : ''
                  }`}
                >
                  <span className="text-base" aria-hidden>⚙️</span>
                  {t('nav.adminPanel')}
                </Link>
              </div>
            ) : null}

            <div className="px-4 pb-2 flex items-center gap-2 border-t border-border pt-3">
              <button
                onClick={() => {
                  document.documentElement.classList.add('theme-transition')
                  setTheme(isDark ? 'light' : 'dark')
                  setTimeout(() => document.documentElement.classList.remove('theme-transition'), 500)
                }}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-sm font-medium text-muted hover:text-main hover:bg-background transition-colors min-h-[44px]"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>{isDark ? t('bottomNav.themeLight') : t('bottomNav.themeDark')}</span>
              </button>

              <button
                onClick={togglePrivacyMode}
                className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition-colors min-h-[44px] ${
                  isPrivacyMode
                    ? 'border-brand/30 bg-brand/10 text-brand'
                    : 'border-border text-muted hover:text-main hover:bg-background'
                }`}
              >
                {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{isPrivacyMode ? t('bottomNav.reveal') : t('bottomNav.hide')}</span>
              </button>

              <button
                onClick={() => { setSheetOpen(false); setShowLogoutModal(true) }}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-sm font-medium text-muted hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors min-h-[44px]"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('bottomNav.logout')}</span>
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}

      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        loggingOut={loggingOut}
        variant="mobile"
      />
    </>
  )
}
