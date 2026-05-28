'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ArrowLeft } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

const items = [
  { href: '/admin/dashboard', label: 'admin.sidebar.overview', Icon: LayoutDashboard, matchAdmin: true },
  { href: '/admin/users', label: 'admin.sidebar.users', Icon: Users, matchAdmin: true },
  { href: '/dashboard', label: 'admin.sidebar.backToApp', Icon: ArrowLeft, matchAdmin: false },
] as const

export default function AdminBottomNav() {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[55] border-t border-border bg-surface/95 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('admin.bottomNav.label')}
    >
      <div className="flex h-16 items-stretch">
        {items.map(({ href, label, Icon, matchAdmin }) => {
          const active = matchAdmin ? isActive(href, pathname) : false
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-brand' : 'text-muted'
              }`}
            >
              {active ? (
                <span className="absolute top-0 h-0.5 w-8 -translate-y-px rounded-full bg-brand" />
              ) : null}
              <Icon className="h-6 w-6 shrink-0" aria-hidden />
              <span className={`text-[10px] font-medium leading-none ${active ? 'text-brand' : 'text-muted'}`}>
                {t(label)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
