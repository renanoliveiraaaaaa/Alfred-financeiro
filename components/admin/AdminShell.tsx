'use client'

import AdminSidebar, { AdminSidebarNav } from '@/components/admin/AdminSidebar'
import AdminBottomNav from '@/components/admin/AdminBottomNav'
import { useI18n } from '@/lib/i18n'

type Props = {
  children: React.ReactNode
}

export default function AdminShell({ children }: Props) {
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen bg-background text-main">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-surface px-4 pt-safe lg:px-6">
          <span className="text-sm font-medium text-muted">{t('admin.topbar.restricted')}</span>
        </header>
        <main className="flex-1 pb-20 max-lg:pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
          {children}
        </main>
      </div>

      <AdminBottomNav />
    </div>
  )
}
