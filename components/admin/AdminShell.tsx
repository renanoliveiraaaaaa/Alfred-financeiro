'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import AdminSidebar, { AdminSidebarNav } from '@/components/admin/AdminSidebar'

type Props = {
  children: React.ReactNode
}

export default function AdminShell({ children }: Props) {
  const { t } = useI18n()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AdminSidebar />

      {mobileOpen && typeof document !== 'undefined'
        ? createPortal(
            <>
              <button
                type="button"
                aria-label={t('common.close')}
                className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <aside
                className="fixed inset-y-0 left-0 z-[71] flex w-[min(18rem,85vw)] flex-col border-r border-slate-800 bg-slate-900 text-slate-200 shadow-2xl lg:hidden"
                role="dialog"
                aria-modal="true"
                aria-label={t('admin.topbar.menu')}
              >
                <div className="flex items-center justify-end border-b border-slate-800 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    aria-label={t('common.close')}
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                <AdminSidebarNav onNavigate={() => setMobileOpen(false)} />
              </aside>
            </>,
            document.body,
          )
        : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label={t('admin.topbar.menu')}
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <span className="text-sm font-medium text-slate-600">{t('admin.topbar.restricted')}</span>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
