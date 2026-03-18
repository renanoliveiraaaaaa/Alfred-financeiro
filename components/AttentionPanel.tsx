'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatDate } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'
import { BellRing, CheckCircle2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Database } from '@/types/supabase'

type Expense = Database['public']['Tables']['expenses']['Row']

function diffDays(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export default function AttentionPanel() {
  const supabase = createSupabaseClient()
  const { toast, toastError } = useToast()
  const pronoun = useGreetingPronoun()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const fetchUrgent = useCallback(async () => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const maxDate = new Date(now)
    maxDate.setDate(maxDate.getDate() + 3)
    const maxDateStr = maxDate.toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('paid', false)
      .lte('due_date', maxDateStr)
      .order('due_date', { ascending: true })

    if (error) {
      toastError(isConnectionError(error) ? CONNECTION_ERROR_MSG : error.message)
      setExpenses([])
    } else {
      setExpenses((data ?? []) as Expense[])
    }
    setLoading(false)
  }, [supabase, toastError])

  useEffect(() => {
    fetchUrgent()
  }, [fetchUrgent])

  const handleMarkPaid = async (exp: Expense) => {
    setMarkingId(exp.id)
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ paid: true })
        .eq('id', exp.id)
      if (error) throw error
      setExpenses((prev) => prev.filter((e) => e.id !== exp.id))
      toast(`Despesa marcada como paga, ${pronoun}.`, 'success')
    } catch (err: unknown) {
      toastError(isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao atualizar.'))
    } finally {
      setMarkingId(null)
    }
  }

  if (loading || expenses.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
          <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-main">
            Atenção, {pronoun} — vencimentos próximos
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
            {expenses.length} despesa{expenses.length > 1 ? 's' : ''} pendente{expenses.length > 1 ? 's' : ''} nos próximos dias
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        <AnimatePresence mode="popLayout">
          {expenses.map((exp) => {
            const diff = exp.due_date ? diffDays(exp.due_date) : 0
            const isOverdue = diff < 0
            return (
              <motion.li
                key={exp.id}
                layout
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-surface/60 border border-amber-100 dark:border-amber-800/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-main truncate">
                    {exp.description}
                  </p>
                  <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted'}`}>
                    {exp.due_date ? formatDate(exp.due_date) : '—'}
                    {isOverdue && ' · Em atraso'}
                    {diff === 0 && !isOverdue && ' · Vence hoje'}
                    {diff > 0 && diff <= 3 && ` · Em ${diff} dia${diff > 1 ? 's' : ''}`}
                  </p>
                </div>
                <MaskedValue
                  value={Number(exp.amount || 0)}
                  className="text-sm font-semibold text-main tabular-nums shrink-0"
                />
                <button
                  onClick={() => handleMarkPaid(exp)}
                  disabled={markingId === exp.id}
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors min-h-[36px] min-w-[36px] justify-center touch-manipulation"
                  title="Marcar como pago"
                >
                  {markingId === exp.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Marcar como Pago</span>
                    </>
                  )}
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </motion.div>
  )
}
