'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ArrowLeft } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type NavProps = {
  onNavigate?: () => void
}

export function AdminSidebarNav({ onNavigate }: NavProps) {
  const pathname = usePathname()
  const { t } = useI18n()

  const nav = [
    { href: '/admin/dashboard', label: t('admin.sidebar.overview'), Icon: LayoutDashboard },
    { href: '/admin/users', label: t('admin.sidebar.users'), Icon: Users },
  ]

  return (
    <>
      <div className="border-b border-border px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{t('admin.sidebar.panel')}</p>
        <p className="mt-1 text-sm font-semibold text-main">{t('admin.sidebar.title')}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {nav.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand/10 text-brand'
                  : 'text-muted hover:bg-background hover:text-main'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted transition-colors hover:bg-background hover:text-main"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t('admin.sidebar.backToApp')}
        </Link>
      </div>
    </>
  )
}

export default function AdminSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface text-main lg:flex lg:w-60">
      <AdminSidebarNav />
    </aside>
  )
}
