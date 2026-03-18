'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { usePrivacy } from '@/lib/privacyContext'
import { LogOut, Sun, Moon, Eye, EyeOff, Plus, Loader2, DoorOpen, Search } from 'lucide-react'
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
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
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
        .select('full_name, avatar_url')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (profile?.full_name) {
        setDisplayName(profile.full_name.split(' ')[0])
      }
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url)
      }
    }
    loadProfile()
  }, [supabase])

  const initials = displayName ? displayName[0].toUpperCase() : '?'
  const isDark = resolvedTheme === 'dark'

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30">
      <div className="h-14 flex items-center justify-between px-5 bg-white dark:bg-manor-900 border-b border-gray-200 dark:border-manor-800 transition-colors">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/15 border border-gold-500/30 text-sm">
              🎩
            </span>
            <span className="hidden sm:inline text-gray-900 dark:text-white">
              Alfred <span className="text-gold-600 dark:text-gold-500 font-normal">Financeiro</span>
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
                      ? 'bg-gold-500/15 text-gold-600 dark:text-gold-400'
                      : 'text-gray-500 dark:text-manor-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-manor-800'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Global search hint */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            title="Buscar (⌘K)"
            className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium border border-gray-200 dark:border-manor-700 text-gray-400 dark:text-manor-500 hover:text-gray-600 dark:hover:text-manor-300 hover:bg-gray-50 dark:hover:bg-manor-800 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Buscar…</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-manor-800 border border-gray-200 dark:border-manor-700">
              ⌘K
            </kbd>
          </button>

          {/* Quick add */}
          <button
            onClick={() => setQuickAddOpen(true)}
            title="Novo lançamento rápido"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-gold-600 dark:bg-gold-500 text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Novo</span>
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-manor-800 mx-0.5" />

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => {
                document.documentElement.classList.add('theme-transition')
                setTheme(isDark ? 'light' : 'dark')
                setTimeout(() => document.documentElement.classList.remove('theme-transition'), 500)
              }}
              title="Ajustar iluminação, senhor"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 dark:text-manor-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors"
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
                ? 'bg-gold-500/15 text-gold-600 dark:text-gold-400'
                : 'text-gray-500 dark:text-manor-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-manor-800'
            }`}
          >
            {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-manor-800 mx-1" />

          {/* Profile */}
          <Link href="/profile" className="flex items-center gap-2.5 group">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-gray-400 dark:text-manor-500 group-hover:text-gray-500 dark:group-hover:text-manor-400 transition-colors">
                À sua disposição
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName || 'Senhor'}</p>
            </div>
            <div className="h-8 w-8 rounded-full border border-gold-500/30 overflow-hidden bg-gray-100 dark:bg-manor-800 flex items-center justify-center shrink-0 glow-hover">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-gold-600 dark:text-gold-400">{initials}</span>
              )}
            </div>
          </Link>

          <button
            onClick={() => setShowLogoutModal(true)}
            title="Encerrar sessão"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-gray-500 dark:text-manor-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

      {/* Logout modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-backdrop-enter">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 shadow-2xl p-6 space-y-4 animate-modal-enter">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gold-100 dark:bg-gold-500/15 flex items-center justify-center shrink-0">
                <DoorOpen className="h-5 w-5 text-gold-600 dark:text-gold-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Deixando a Mansão?</h2>
            </div>

            <p className="text-sm text-gray-600 dark:text-manor-300 leading-relaxed">
              Deseja realmente encerrar a sua sessão, patrão? Estarei aqui aguardando o seu retorno para cuidar das finanças.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 disabled:opacity-50 transition-colors"
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
        </div>
      )}
    </header>
  )
}
