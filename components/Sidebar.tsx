'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
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
  ChevronDown,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  Icon: React.ElementType
  sub?: boolean
}

// Itens sempre visíveis (sem agrupamento com label)
const flatItems: NavItem[] = [
  { href: '/dashboard', label: 'Visão geral', Icon: LayoutDashboard },
  { href: '/revenues', label: 'Entradas', Icon: TrendingUp },
  { href: '/expenses', label: 'Saídas', Icon: Receipt },
  { href: '/credit-cards', label: 'Cartões', Icon: CreditCard },
  { href: '/subscriptions', label: 'Assinaturas', Icon: RefreshCw },
  { href: '/income-sources', label: 'Fontes de renda', Icon: Wallet },
  { href: '/goals', label: 'Cofres', Icon: PiggyBank },
  { href: '/settings', label: 'Cadastros', Icon: Settings },
  { href: '/profile', label: 'Perfil', Icon: UserCircle },
]

// Grupos que viram botões expansíveis
const accordions = [
  {
    key: 'planejamento',
    label: 'Planejamento',
    Icon: Target,
    items: [
      { href: '/projections', label: 'Orçamento', Icon: Target },
      { href: '/reports', label: 'Relatórios', Icon: BarChart3 },
    ],
  },
  {
    key: 'extratos',
    label: 'Extratos',
    Icon: FileUp,
    items: [
      { href: '/import-statement', label: 'Importar extrato', Icon: FileUp },
      { href: '/import-history', label: 'Histórico', Icon: History },
    ],
  },
]

function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Sidebar() {
  const pathname = usePathname()

  // Abre o accordion cujo item está ativo
  const getInitialOpen = () => {
    const open: Record<string, boolean> = {}
    accordions.forEach((acc) => {
      open[acc.key] = acc.items.some((item) => isActive(item.href, pathname))
    })
    return open
  }

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(getInitialOpen)

  useEffect(() => {
    setOpenAccordions((prev) => {
      const next = { ...prev }
      accordions.forEach((acc) => {
        if (acc.items.some((item) => isActive(item.href, pathname))) {
          next[acc.key] = true
        }
      })
      return next
    })
  }, [pathname])

  const toggle = (key: string) =>
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <aside className="max-lg:hidden fixed inset-y-0 left-0 z-50 h-screen w-60 bg-surface border-r border-border flex flex-col shrink-0 transition-colors glass-sidebar overflow-y-auto">

      {/* ── Brand header ── */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border shrink-0">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 border border-brand/20 text-sm shrink-0">
          🎩
        </span>
        <span className="max-lg:hidden text-sm font-semibold text-main leading-none">
          Alfred <span className="text-brand font-normal">Financeiro</span>
        </span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">

          {/* Itens fixos */}
          {flatItems.map((item) => {
            const active = isActive(item.href, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-brand/10 text-brand'
                    : 'text-muted hover:text-main hover:bg-background/80'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-brand" />
                )}
                <item.Icon className="h-4 w-4 shrink-0" />
                <span className={`leading-none ${active ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* Divisor antes dos accordions */}
          <div className="my-2 mx-1 border-t border-border" />

          {/* Accordions: Planejamento e Extratos */}
          {accordions.map((acc) => {
            const isOpen = openAccordions[acc.key]
            const hasActive = acc.items.some((item) => isActive(item.href, pathname))

            return (
              <div key={acc.key}>
                {/* Botão do accordion */}
                <button
                  onClick={() => toggle(acc.key)}
                  title={acc.label}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    hasActive
                      ? 'text-brand'
                      : 'text-muted hover:text-main hover:bg-background/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <acc.Icon className="h-4 w-4 shrink-0" />
                    <span className="leading-none">{acc.label}</span>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {/* Subitens com animação CSS grid */}
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-0.5 pl-4 pt-0.5 pb-0.5">
                      {acc.items.map((item) => {
                        const active = isActive(item.href, pathname)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                              active
                                ? 'bg-brand/10 text-brand font-semibold'
                                : 'text-muted hover:text-main hover:bg-background/80 font-medium'
                            }`}
                          >
                            {active && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-brand" />
                            )}
                            <item.Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="leading-none text-[13px]">
                              {item.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

        </div>
      </nav>
    </aside>
  )
}
