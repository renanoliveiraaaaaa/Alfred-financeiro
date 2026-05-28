'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { usePrivacy } from '@/lib/privacyContext'
import { LogOut, Sun, Moon, Eye, EyeOff, Plus, Building2 } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import LogoutModal from '@/components/LogoutModal'
import { useGreetingPronoun } from '@/lib/greeting'
import QuickAddModal from '@/components/QuickAddModal'
import { useUserPreferences } from '@/lib/userPreferencesContext'
import { useI18n } from '@/lib/i18n'
import { formatTrialCountdownLabel, trialDaysLeft as getTrialDaysLeft } from '@/lib/billing/trialLabel'

const PAGE_KEYS: Record<string, string> = {
  '/dashboard': 'page.dashboard',
  '/revenues': 'page.revenues',
  '/expenses': 'page.expenses',
  '/credit-cards': 'page.creditCards',
  '/subscriptions': 'page.subscriptions',
  '/income-sources': 'page.incomeSources',
  '/goals': 'page.goals',
  '/projections': 'page.projections',
  '/reports': 'page.reports',
  '/import-statement': 'page.importStatement',
  '/import-history': 'page.importHistory',
  '/settings': 'page.settings',
  '/profile': 'page.profile',
}

const BUSINESS_PAGE_KEYS: Record<string, string> = {
  '/revenues': 'page.businessRevenues',
  '/expenses': 'page.businessExpenses',
  '/subscriptions': 'page.businessSubscriptions',
  '/income-sources': 'page.businessIncomeSources',
  '/goals': 'page.businessGoals',
}

function getPageTitle(pathname: string, isBusiness: boolean, t: (key: string) => string): string {
  const base = '/' + pathname.split('/')[1]
  if (isBusiness && BUSINESS_PAGE_KEYS[base]) return t(BUSINESS_PAGE_KEYS[base])
  const key = PAGE_KEYS[pathname] ?? PAGE_KEYS[base]
  return key ? t(key) : ''
}

export default function Topbar() {
  const { t } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { setTheme, resolvedTheme } = useTheme()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()
  const { activeOrgType } = useUserPreferences()
  const isBusiness = activeOrgType === 'business'
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
  const pageTitle = getPageTitle(pathname, isBusiness, t)

  const trialDaysLeft =
    planStatus === 'trial' && trialEndsAt ? getTrialDaysLeft(trialEndsAt) : null

  const trialBadgeLabel = formatTrialCountdownLabel(t, trialDaysLeft)

  const showTrialBadge =
    trialBadgeLabel !== null && trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft <= 7

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 pt-safe backdrop-blur-md glass-topbar standalone-safe-top">
        {showTrialBadge && (
          <div className="px-4 py-1.5 text-center text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border-b border-amber-500/20">
            {t('trial.banner').replace('{label}', trialBadgeLabel!)}
          </div>
        )}
        <div className="min-h-14 flex items-center justify-between px-4 sm:px-5 gap-2 py-1.5 transition-colors">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex flex-col gap-0.5 min-w-0 group shrink"
              title={t('topbar.goDashboard')}
            >
              <span className="text-base font-bold tracking-tight text-main leading-none group-hover:text-brand transition-colors flex items-center gap-1.5">
                Alfred
                {isBusiness && (
                  <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-500/20">
                    <Building2 className="h-2.5 w-2.5" />
                    {t('topbar.business')}
                  </span>
                )}
              </span>
              {pageTitle ? (
                <span className="text-[11px] sm:text-xs font-medium text-muted truncate max-w-[45vw] sm:max-w-none">
                  {pageTitle}
                </span>
              ) : (
                <span className="text-[11px] sm:text-xs font-medium text-muted">{t('page.financeiro')}</span>
              )}
            </Link>
            <div className="lg:hidden shrink-0">
              <OrganizationSwitcher variant="compact" />
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {showTrialBadge && (
              <span className="mr-0.5 hidden items-center rounded-md bg-amber-500/10 px-1.5 py-1 text-[10px] font-medium text-amber-600 ring-1 ring-inset ring-amber-500/20 sm:inline-flex sm:px-2 sm:text-xs dark:text-amber-400">
                {trialBadgeLabel}
              </span>
            )}

            <div className="max-lg:hidden">
              <LanguageSwitcher />
            </div>

            <button
              onClick={() => setQuickAddOpen(true)}
              title={t('topbar.quickAddTitle')}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold bg-brand text-white hover:bg-brand/90 active:scale-95 transition-all min-h-[44px] sm:min-h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('topbar.quickAdd')}</span>
            </button>

            <div className="max-lg:hidden w-px h-5 bg-border mx-1.5" />

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
                title={isDark ? t('topbar.themeLight') : t('topbar.themeDark')}
                className="max-lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}

            <button
              onClick={togglePrivacyMode}
              title={isPrivacyMode ? t('topbar.showValues') : t('topbar.hideValues')}
              className={`max-lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors ${
                isPrivacyMode
                  ? 'bg-brand/15 text-brand'
                  : 'text-muted hover:text-main hover:bg-background'
              }`}
            >
              {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            <div className="max-lg:hidden w-px h-5 bg-border mx-1.5" />

            <Link
              href="/profile"
              title={`${t('topbar.profileTitle')} — ${displayName || pronoun}`}
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

            <button
              onClick={() => setShowLogoutModal(true)}
              title={t('topbar.logoutTitle')}
              className="max-lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        loggingOut={loggingOut}
        displayName={displayName}
        variant="desktop"
      />
    </>
  )
}
