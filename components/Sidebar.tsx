'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Target,
  BarChart3,
  CreditCard,
  PiggyBank,
  RefreshCw,
  Settings,
  UserCircle,
  Wallet,
  FileUp,
} from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Visão geral', Icon: LayoutDashboard },
  { href: '/expenses', label: 'Saídas', Icon: Receipt },
  { href: '/revenues', label: 'Entradas', Icon: TrendingUp },
  { href: '/income-sources', label: 'Fontes de renda', Icon: Wallet },
  { href: '/credit-cards', label: 'Cartões', Icon: CreditCard },
  { href: '/subscriptions', label: 'Assinaturas', Icon: RefreshCw },
  { href: '/goals', label: 'Cofres', Icon: PiggyBank },
  { href: '/projections', label: 'Orçamento', Icon: Target },
  { href: '/reports', label: 'Relatórios', Icon: BarChart3 },
  { href: '/import-statement', label: 'Importar Extrato', Icon: FileUp },
  { href: '/settings', label: 'Cadastros', Icon: Settings },
  { href: '/profile', label: 'Perfil', Icon: UserCircle },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 h-screen w-60 bg-surface border-r border-border flex flex-col py-4 shrink-0 max-md:w-16 max-md:items-center max-md:py-3 transition-colors glass-sidebar">
      <nav className="flex-1 space-y-0.5 px-3 max-md:px-1.5">
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 max-md:justify-center max-md:px-2 ${
                isActive
                  ? 'bg-brand/15 text-brand border border-brand/20'
                  : 'text-muted hover:text-main hover:bg-background border border-transparent'
              }`}
            >
              <item.Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="max-md:sr-only">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="px-4 pt-4 border-t border-border max-md:hidden">
        <p className="text-[10px] uppercase tracking-widest text-muted text-center">
          Alfred Financeiro
        </p>
      </div>
    </aside>
  )
}
