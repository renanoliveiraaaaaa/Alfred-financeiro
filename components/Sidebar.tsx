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
  { href: '/settings', label: 'Cadastros', Icon: Settings },
  { href: '/profile', label: 'Perfil', Icon: UserCircle },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-[calc(100vh-3.5rem)] bg-white dark:bg-manor-900 border-r border-gray-200 dark:border-manor-800 flex flex-col py-4 shrink-0 max-md:w-16 max-md:items-center max-md:py-3 transition-colors">
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
                  ? 'bg-gold-100 dark:bg-gold-500/15 text-gold-700 dark:text-gold-400 border border-gold-200 dark:border-gold-500/20'
                  : 'text-gray-500 dark:text-manor-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-manor-800 border border-transparent'
              }`}
            >
              <item.Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="max-md:sr-only">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="px-4 pt-4 border-t border-gray-200 dark:border-manor-800 max-md:hidden">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-manor-600 text-center">
          Alfred Financeiro
        </p>
      </div>
    </aside>
  )
}
