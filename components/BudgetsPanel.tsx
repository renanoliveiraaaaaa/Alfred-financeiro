'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import MaskedValue from '@/components/MaskedValue'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { Target } from 'lucide-react'
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

    setItems(result)
    setLoading(false)
  }, [supabase, toastError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading || items.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
            <Target className="h-4 w-4 text-brand" />
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

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.category.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-main">{item.category.name}</span>
              <span className="text-muted tabular-nums">
                <MaskedValue value={item.spent} className="font-semibold text-main" />
                {' de '}
                <MaskedValue value={item.budget} />
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(item.percent)}`}
                style={{ width: `${Math.min(item.percent, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
