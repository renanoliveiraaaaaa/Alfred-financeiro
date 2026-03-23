'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import MaskedValue from '@/components/MaskedValue'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { Target, AlertTriangle, XCircle, TrendingUp } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Category = Database['public']['Tables']['categories']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']

type BudgetItem = {
  category: Category
  spent: number
  budget: number
  percent: number
}

function barColor(percent: number): string {
  if (percent < 80) return 'bg-emerald-500'
  if (percent < 100) return 'bg-amber-500'
  return 'bg-red-500'
}

function percentLabel(percent: number): string {
  return `${Math.round(Math.min(percent, 999))}%`
}

export default function BudgetsPanel() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()
  const [items, setItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

    const [catRes, expRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .gt('monthly_budget', 0)
        .order('name', { ascending: true }),
      supabase
        .from('expenses')
        .select('category, amount')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd),
    ])

    if (catRes.error) {
      toastError(isConnectionError(catRes.error) ? CONNECTION_ERROR_MSG : catRes.error.message)
      setItems([])
      setLoading(false)
      return
    }
    if (expRes.error) {
      toastError(isConnectionError(expRes.error) ? CONNECTION_ERROR_MSG : expRes.error.message)
      setItems([])
      setLoading(false)
      return
    }

    const categories = (catRes.data ?? []) as Category[]
    const expenses = (expRes.data ?? []) as Expense[]

    const spentByCategory: Record<string, number> = {}
    expenses.forEach((e) => {
      const cat = e.category || 'outros'
      spentByCategory[cat] = (spentByCategory[cat] || 0) + Number(e.amount || 0)
    })

    const result: BudgetItem[] = categories
      .map((cat) => {
        const budget = Number(cat.monthly_budget) || 0
        const spent = spentByCategory[cat.name] || 0
        const percent = budget > 0 ? (spent / budget) * 100 : 0
        return { category: cat, spent, budget, percent }
      })
      .filter((i) => i.budget > 0)
      // Ordenar: estourados primeiro, depois próximos do limite, depois ok
      .sort((a, b) => b.percent - a.percent)

    setItems(result)
    setLoading(false)
  }, [supabase, toastError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading || items.length === 0) return null

  const exceeded = items.filter((i) => i.percent >= 100)
  const nearLimit = items.filter((i) => i.percent >= 80 && i.percent < 100)
  const hasAlerts = exceeded.length > 0 || nearLimit.length > 0

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4 glass-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
            exceeded.length > 0
              ? 'bg-red-500/15'
              : nearLimit.length > 0
              ? 'bg-amber-500/15'
              : 'bg-brand/15'
          }`}>
            <Target className={`h-4 w-4 ${
              exceeded.length > 0
                ? 'text-red-500'
                : nearLimit.length > 0
                ? 'text-amber-500'
                : 'text-brand'
            }`} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-main">Orçamento Mensal</h2>
            <p className="text-xs text-muted">Acompanhe o progresso por categoria</p>
          </div>
        </div>
        <Link
          href="/settings"
          className="text-xs font-medium text-brand hover:opacity-80 transition-colors"
        >
          Configurar
        </Link>
      </div>

      {/* Banner de alertas */}
      {hasAlerts && (
        <div className={`rounded-lg px-3.5 py-3 space-y-1 ${
          exceeded.length > 0
            ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30'
            : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30'
        }`}>
          {exceeded.length > 0 && (
            <div className="flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-xs font-medium text-red-800 dark:text-red-300">
                {exceeded.length === 1
                  ? `"${exceeded[0].category.name}" estourou o orçamento`
                  : `${exceeded.length} categorias estouraram o orçamento`}
              </p>
            </div>
          )}
          {nearLimit.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                {nearLimit.length === 1
                  ? `"${nearLimit[0].category.name}" está perto do limite`
                  : `${nearLimit.length} categorias próximas do limite`}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => {
          const isExceeded = item.percent >= 100
          const isNear = item.percent >= 80 && item.percent < 100
          const remaining = item.budget - item.spent

          return (
            <div
              key={item.category.id}
              className={`space-y-1.5 rounded-lg p-2.5 -mx-2.5 transition-colors ${
                isExceeded
                  ? 'bg-red-50/60 dark:bg-red-500/5'
                  : isNear
                  ? 'bg-amber-50/60 dark:bg-amber-500/5'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isExceeded && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                  {isNear && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  {!isExceeded && !isNear && <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  <span className="font-medium text-main truncate">{item.category.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold tabular-nums ${
                    isExceeded
                      ? 'text-red-600 dark:text-red-400'
                      : isNear
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {percentLabel(item.percent)}
                  </span>
                  <span className="text-muted tabular-nums text-xs">
                    <MaskedValue value={item.spent} className="font-semibold text-main" />
                    {' / '}
                    <MaskedValue value={item.budget} />
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(item.percent)}`}
                  style={{ width: `${Math.min(item.percent, 100)}%` }}
                />
              </div>
              {isExceeded && (
                <p className="text-[11px] text-red-600 dark:text-red-400">
                  Excedeu em{' '}
                  <MaskedValue
                    value={Math.abs(remaining)}
                    className="font-semibold"
                  />
                </p>
              )}
              {isNear && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Restam{' '}
                  <MaskedValue
                    value={remaining}
                    className="font-semibold"
                  />{' '}
                  disponíveis
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
