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
  History,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  Icon: React.ElementType
  sub?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    label: '',
    items: [
      { href: '/dashboard', label: 'Visão geral', Icon: LayoutDashboard },
    ],
  },
  {
    label: 'Movimentações',
    items: [
      { href: '/revenues', label: 'Entradas', Icon: TrendingUp },
      { href: '/expenses', label: 'Saídas', Icon: Receipt },
    ],
  },
  {
    label: 'Patrimônio',
    items: [
      { href: '/credit-cards', label: 'Cartões', Icon: CreditCard },
      { href: '/subscriptions', label: 'Assinaturas', Icon: RefreshCw },
      { href: '/income-sources', label: 'Fontes de renda', Icon: Wallet },
      { href: '/goals', label: 'Cofres', Icon: PiggyBank },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { href: '/projections', label: 'Orçamento', Icon: Target },
      { href: '/reports', label: 'Relatórios', Icon: BarChart3 },
    ],
  },
  {
    label: 'Extratos',
    items: [
      { href: '/import-statement', label: 'Importar extrato', Icon: FileUp },
      { href: '/import-history', label: 'Histórico', Icon: History, sub: true },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/settings', label: 'Cadastros', Icon: Settings },
      { href: '/profile', label: 'Perfil', Icon: UserCircle },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 h-screen w-60 bg-surface border-r border-border flex flex-col py-4 shrink-0 max-md:w-16 max-md:items-center max-md:py-3 transition-colors glass-sidebar overflow-y-auto">
      <nav className="flex-1 px-3 max-md:px-1.5 space-y-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {/* Label do grupo — só aparece em telas maiores */}
            {group.label && (
              <p className="max-md:hidden px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted/60 select-none">
                {group.label}
              </p>
            )}

            {/* Separador no mobile entre grupos (exceto o primeiro) */}
            {gi > 0 && (
              <div className="md:hidden mx-auto w-8 border-t border-border mb-2" />
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 max-md:justify-center max-md:px-2 ${
                      item.sub ? 'ml-3 max-md:ml-0' : ''
                    } ${
                      isActive
                        ? 'bg-brand/15 text-brand border border-brand/20'
                        : 'text-muted hover:text-main hover:bg-background border border-transparent'
                    }`}
                  >
                    <item.Icon className={`shrink-0 ${item.sub ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]'}`} />
                    <span className={`max-md:sr-only ${item.sub ? 'text-xs' : ''}`}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 pt-4 border-t border-border max-md:hidden shrink-0">
        <p className="text-[10px] uppercase tracking-widest text-muted text-center">
          Alfred Financeiro
        </p>
      </div>
    </aside>
  )
}
