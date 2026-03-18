'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Wallet,
  CreditCard,
  RefreshCw,
  PiggyBank,
  Target,
  BarChart3,
  Settings,
  UserCircle,
} from 'lucide-react'

const ITEMS = [
  { href: '/dashboard', label: 'Visão geral', desc: 'Painel principal', Icon: LayoutDashboard },
  { href: '/expenses', label: 'Saídas', desc: 'Gerenciar despesas', Icon: Receipt },
  { href: '/expenses/new', label: 'Nova saída', desc: 'Registrar nova despesa', Icon: Receipt },
  { href: '/revenues', label: 'Entradas', desc: 'Gerenciar receitas', Icon: TrendingUp },
  { href: '/revenues/new', label: 'Nova entrada', desc: 'Registrar nova receita', Icon: TrendingUp },
  { href: '/income-sources', label: 'Fontes de renda', desc: 'Receitas recorrentes', Icon: Wallet },
  { href: '/credit-cards', label: 'Cartões', desc: 'Cartões de crédito', Icon: CreditCard },
  { href: '/subscriptions', label: 'Assinaturas', desc: 'Serviços recorrentes', Icon: RefreshCw },
  { href: '/goals', label: 'Cofres', desc: 'Metas de economia', Icon: PiggyBank },
  { href: '/projections', label: 'Orçamento', desc: 'Planejamento financeiro', Icon: Target },
  { href: '/reports', label: 'Relatórios', desc: 'Análise patrimonial', Icon: BarChart3 },
  { href: '/settings', label: 'Cadastros', desc: 'Configurações gerais', Icon: Settings },
  { href: '/profile', label: 'Perfil', desc: 'Dados da conta', Icon: UserCircle },
]

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return ITEMS
    const q = query.toLowerCase()
    return ITEMS.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q) ||
        i.href.toLowerCase().includes(q)
    )
  }, [query])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIdx(0)
  }, [])

  const navigate = useCallback(
    (href: string) => {
      close()
      router.push(href)
    },
    [close, router]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        close()
      }
    }
    const openHandler = () => setOpen(true)
    window.addEventListener('keydown', handler)
    window.addEventListener('open-command-palette', openHandler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('open-command-palette', openHandler)
    }
  }, [close])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i < filtered.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i > 0 ? i - 1 : filtered.length - 1))
    } else if (e.key === 'Enter' && filtered[activeIdx]) {
      e.preventDefault()
      navigate(filtered[activeIdx].href)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-manor-800">
          <Search className="h-4 w-4 text-gray-400 dark:text-manor-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar página ou ação…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-12 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-manor-800 text-gray-400 dark:text-manor-500 border border-gray-200 dark:border-manor-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-manor-500">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </li>
          ) : (
            filtered.map((item, idx) => (
              <li key={item.href}>
                <button
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    idx === activeIdx
                      ? 'bg-gold-50 dark:bg-gold-500/10 text-gold-700 dark:text-gold-400'
                      : 'text-gray-700 dark:text-manor-300 hover:bg-gray-50 dark:hover:bg-manor-800'
                  }`}
                >
                  <item.Icon className="h-4 w-4 shrink-0 opacity-60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs opacity-60 truncate">{item.desc}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>

        {/* Footer hint */}
        <div className="border-t border-gray-200 dark:border-manor-800 px-4 py-2 flex items-center gap-4 text-[10px] text-gray-400 dark:text-manor-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-manor-800 border border-gray-200 dark:border-manor-700">↑↓</kbd>
            navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-manor-800 border border-gray-200 dark:border-manor-700">↵</kbd>
            abrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-manor-800 border border-gray-200 dark:border-manor-700">esc</kbd>
            fechar
          </span>
        </div>
      </div>
    </div>
  )
}
