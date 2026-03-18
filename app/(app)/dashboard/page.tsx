'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { seedCategoriesIfEmpty } from '@/lib/seedCategories'
import { formatCurrency, formatDate, getGreeting, getMonthName } from '@/lib/format'
import { useGreetingPronoun, getGreetingWithName, getGreetingSuffix } from '@/lib/greeting'
import MaskedValue from '@/components/MaskedValue'
import WelcomeModal, { shouldShowWelcomeModal } from '@/components/WelcomeModal'
import AttentionPanel from '@/components/AttentionPanel'
import BudgetsPanel from '@/components/BudgetsPanel'
import { useUserPreferences } from '@/lib/userPreferencesContext'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { RefreshCw, Loader2 } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Revenue = Database['public']['Tables']['revenues']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']
type Subscription = Database['public']['Tables']['subscriptions']['Row']
type IncomeSource = Database['public']['Tables']['income_sources']['Row']

type Movement = {
  id: string
  type: 'revenue' | 'expense'
  description: string
  amount: number
  date: string
  status: string
}

function diffDays(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function dueBadge(dateStr: string | null) {
  if (!dateStr) return { label: '—', cls: 'bg-border text-muted' }
  const diff = diffDays(dateStr)
  if (diff < 0)
    return { label: 'Em atraso', cls: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-200 dark:ring-red-500/30' }
  if (diff === 0)
    return { label: 'Vence hoje', cls: 'bg-brand/15 text-brand ring-1 ring-inset ring-brand/30' }
  if (diff <= 3)
    return {
      label: `Vence em ${diff} dia${diff > 1 ? 's' : ''}`,
      cls: 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/20',
    }
  return { label: formatDate(dateStr), cls: 'bg-border text-muted ring-1 ring-inset ring-border' }
}

export default function DashboardPage() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()
  const { gender } = useUserPreferences()
  const pronoun = useGreetingPronoun()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [profileName, setProfileName] = useState('')

  const [totalRevenues, setTotalRevenues] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [projectedExpenses, setProjectedExpenses] = useState(0)

  const [movements, setMovements] = useState<Movement[]>([])
  const [unpaid, setUnpaid] = useState<Expense[]>([])
  const [dueSubs, setDueSubs] = useState<Subscription[]>([])
  const [processingSubId, setProcessingSubId] = useState<string | null>(null)
  const [dueIncomeSources, setDueIncomeSources] = useState<IncomeSource[]>([])
  const [processingIncomeId, setProcessingIncomeId] = useState<string | null>(null)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)

  const balance = totalRevenues - totalExpenses
  const budgetPercent = projectedExpenses > 0 ? (totalExpenses / projectedExpenses) * 100 : 0

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: userData } = await supabase.auth.getUser()
        setUserEmail(userData.user?.email ?? '')

        if (userData.user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userData.user.id)
            .maybeSingle()
          if (prof?.full_name) setProfileName(prof.full_name)

          const isNewUser = await seedCategoriesIfEmpty(supabase)
          if (isNewUser && shouldShowWelcomeModal()) {
            setShowWelcomeModal(true)
          }
        }

        const now = new Date()
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

        const today = now.toISOString().slice(0, 10)

        const [revRes, expRes, projRes, unpaidRes, subsRes, incomeRes] = await Promise.all([
          supabase.from('revenues').select('*').gte('date', monthStart).lte('date', monthEnd).order('date', { ascending: false }),
          supabase.from('expenses').select('*').gte('due_date', monthStart).lte('due_date', monthEnd).order('due_date', { ascending: false }),
          supabase.from('projections').select('projected_expenses').eq('month', monthStart).maybeSingle(),
          supabase.from('expenses').select('*').eq('paid', false).order('due_date', { ascending: true }).limit(10),
          supabase.from('subscriptions').select('*').eq('active', true).lte('next_billing_date', today).order('next_billing_date', { ascending: true }),
          supabase.from('income_sources').select('*').eq('active', true).lte('next_receipt_date', today).order('next_receipt_date', { ascending: true }),
        ])

        if (revRes.error) throw revRes.error
        if (expRes.error) throw expRes.error

        const revenues = (revRes.data ?? []) as Revenue[]
        const expenses = (expRes.data ?? []) as Expense[]

        const tRev = revenues.reduce((s, r) => s + Number(r.amount || 0), 0)
        const tExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
        setTotalRevenues(tRev)
        setTotalExpenses(tExp)
        setProjectedExpenses(Number(projRes.data?.projected_expenses || 0))
        setUnpaid((unpaidRes.data ?? []) as Expense[])
        setDueSubs((subsRes.data ?? []) as Subscription[])
        setDueIncomeSources((incomeRes.data ?? []) as IncomeSource[])

        const revMoves: Movement[] = revenues.map((r) => ({
          id: r.id, type: 'revenue', description: r.description,
          amount: Number(r.amount || 0), date: r.date, status: r.received ? 'Recebida' : 'Pendente',
        }))
        const expMoves: Movement[] = expenses.map((e) => ({
          id: e.id, type: 'expense', description: e.description,
          amount: Number(e.amount || 0), date: e.due_date || e.created_at?.slice(0, 10) || '', status: e.paid ? 'Quitada' : 'Em aberto',
        }))
        setMovements([...revMoves, ...expMoves].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7))
      } catch (err: any) {
        console.error(err)
        setError(err?.message || 'Falha ao carregar dados do patrimônio.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  const firstName = useMemo(() => {
    if (profileName) return profileName.split(' ')[0]
    if (!userEmail) return ''
    const name = userEmail.split('@')[0] || ''
    return name.charAt(0).toUpperCase() + name.slice(1)
  }, [profileName, userEmail])

  const handleRegisterSub = async (sub: Subscription) => {
    setProcessingSubId(sub.id)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { error: insertErr } = await supabase.from('expenses').insert({
        user_id: userData.user.id,
        amount: sub.amount,
        description: `${sub.name} (assinatura)`,
        category: sub.category || 'assinaturas',
        payment_method: 'debito' as const,
        due_date: sub.next_billing_date,
        paid: true,
      })
      if (insertErr) throw insertErr

      const next = new Date(sub.next_billing_date + 'T12:00:00')
      if (sub.billing_cycle === 'anual') {
        next.setFullYear(next.getFullYear() + 1)
      } else {
        next.setMonth(next.getMonth() + 1)
      }
      const nextDate = next.toISOString().slice(0, 10)

      const { error: updateErr } = await supabase.from('subscriptions').update({ next_billing_date: nextDate }).eq('id', sub.id)
      if (updateErr) throw updateErr

      setDueSubs((prev) => prev.filter((s) => s.id !== sub.id))
      setTotalExpenses((prev) => prev + Number(sub.amount))
    } catch (err: unknown) {
      console.error(err)
      toastError(isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao registrar.'))
    } finally {
      setProcessingSubId(null)
    }
  }

  const handleConfirmIncome = async (source: IncomeSource) => {
    setProcessingIncomeId(source.id)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const today = new Date().toISOString().slice(0, 10)

      const { error: insertErr } = await supabase.from('revenues').insert({
        user_id: userData.user.id,
        amount: source.amount,
        description: source.name,
        date: today,
        expected_date: null,
        received: true,
      })
      if (insertErr) throw insertErr

      const base = new Date(source.next_receipt_date + 'T12:00:00')
      if (source.frequency === 'mensal') {
        base.setMonth(base.getMonth() + 1)
      } else if (source.frequency === 'quinzenal') {
        base.setDate(base.getDate() + 15)
      } else {
        base.setDate(base.getDate() + 7)
      }
      const nextDate = base.toISOString().slice(0, 10)

      const { error: updateErr } = await supabase.from('income_sources').update({ next_receipt_date: nextDate }).eq('id', source.id)
      if (updateErr) throw updateErr

      setDueIncomeSources((prev) => prev.filter((s) => s.id !== source.id))
      setTotalRevenues((prev) => prev + Number(source.amount))
    } catch (err: unknown) {
      console.error(err)
      toastError(isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao confirmar.'))
    } finally {
      setProcessingIncomeId(null)
    }
  }

  const c = {
    card: 'rounded-xl border border-border bg-surface transition-colors',
    label: 'text-xs font-medium uppercase tracking-wider text-muted',
    h1: 'text-xl font-semibold text-main',
    h2: 'text-sm font-semibold text-main',
    sub: 'text-sm text-muted',
    divider: 'divide-y divide-border',
    borderB: 'border-b border-border',
    skel: 'bg-border rounded animate-pulse',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className={`h-6 w-56 ${c.skel}`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${c.card} p-4 animate-pulse`}>
              <div className={`h-3 w-20 ${c.skel} mb-3`} />
              <div className={`h-7 w-28 ${c.skel}`} />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className={`lg:col-span-3 ${c.card} p-6 animate-pulse`}>
            <div className={`h-4 w-40 ${c.skel} mb-4`} />
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className={`h-10 ${c.skel}`} />)}</div>
          </div>
          <div className={`lg:col-span-2 ${c.card} p-6 animate-pulse`}>
            <div className={`h-4 w-40 ${c.skel} mb-4`} />
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className={`h-10 ${c.skel}`} />)}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <WelcomeModal open={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} pronoun={pronoun} />

      <div>
        <h1 className={c.h1}>
          {getGreetingWithName(getGreeting(), firstName || '', gender)}!
        </h1>
        <p className={`${c.sub} mt-0.5`}>Visão geral do patrimônio — {getMonthName()}</p>
      </div>

      <AttentionPanel />

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Alertas de recebimentos agendados */}
      {dueIncomeSources.length > 0 && (
        <div className={`${c.card} p-4 space-y-3 border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <p className="text-sm font-semibold text-main">Boas notícias{getGreetingSuffix(gender)}</p>
          </div>
          <ul className={c.divider}>
            {dueIncomeSources.map((src) => (
              <li key={src.id} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-main">
                    O seu pagamento de <strong>{src.name}</strong> (<MaskedValue value={Number(src.amount)} className="font-semibold" />) está agendado para hoje. Deseja confirmar a entrada no cofre?
                  </p>
                </div>
                <button
                  onClick={() => handleConfirmIncome(src)}
                  disabled={processingIncomeId === src.id}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                  {processingIncomeId === src.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Confirmar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alertas de assinaturas vencidas */}
      {dueSubs.length > 0 && (
        <div className={`${c.card} p-4 space-y-3`}>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-brand" />
            <p className="text-sm font-semibold text-main">Renovações pendentes</p>
          </div>
          <ul className={c.divider}>
            {dueSubs.map((sub) => (
              <li key={sub.id} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-main">
                    Senhor, a sua assinatura de <strong>{sub.name}</strong> (<MaskedValue value={Number(sub.amount)} className="font-semibold" />) foi renovada.
                  </p>
                </div>
                <button
                  onClick={() => handleRegisterSub(sub)}
                  disabled={processingSubId === sub.id}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {processingSubId === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Registrar saída
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`${c.card} p-4`}>
          <p className={c.label}>Saldo do mês</p>
          <MaskedValue value={balance} className={`mt-1.5 text-2xl font-semibold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
        </div>
        <div className={`${c.card} p-4`}>
          <p className={c.label}>Entradas</p>
          <MaskedValue value={totalRevenues} className="mt-1.5 text-2xl font-semibold text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className={`${c.card} p-4`}>
          <p className={c.label}>Saídas</p>
          <MaskedValue value={totalExpenses} className="mt-1.5 text-2xl font-semibold text-red-600 dark:text-red-400" />
        </div>
        <div className={`${c.card} p-4`}>
          <p className={c.label}>Orçamento</p>
          {projectedExpenses > 0 ? (
            <>
              <p className={`mt-1.5 text-2xl font-semibold ${
                budgetPercent > 100 ? 'text-red-600 dark:text-red-400' : budgetPercent > 80 ? 'text-brand' : 'text-main'
              }`}>
                {Math.round(budgetPercent)}%
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    budgetPercent > 100 ? 'bg-red-500' : budgetPercent > 80 ? 'bg-brand' : 'bg-brand'
                  }`}
                  style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-muted">
              <Link href="/projections" className="text-brand hover:opacity-80 transition-colors">Definir metas</Link>
            </p>
          )}
        </div>
      </section>

      <BudgetsPanel />

      <section className="grid gap-6 lg:grid-cols-5">
        <div className={`lg:col-span-3 ${c.card}`}>
          <div className={`${c.borderB} px-5 py-4 flex items-center justify-between`}>
            <h2 className={c.h2}>Últimas movimentações</h2>
            <div className="flex gap-3">
              <Link href="/revenues" className="text-xs text-brand hover:opacity-80 transition-colors">Entradas</Link>
              <Link href="/expenses" className="text-xs text-brand hover:opacity-80 transition-colors">Saídas</Link>
            </div>
          </div>
          <div className="px-5 py-2">
            {movements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                Tudo em ordem no momento{getGreetingSuffix(gender)}. Nenhuma movimentação registrada neste mês.
              </p>
            ) : (
              <ul className={c.divider}>
                {movements.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
                      m.type === 'revenue'
                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400'
                    }`}>
                      {m.type === 'revenue' ? '↑' : '↓'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-main truncate">{m.description}</p>
                      <p className="text-xs text-muted">{formatDate(m.date)} · {m.status}</p>
                    </div>
                    <MaskedValue
                      value={m.amount}
                      className={`text-sm font-semibold tabular-nums ${
                        m.type === 'revenue' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={`lg:col-span-2 ${c.card}`}>
          <div className={`${c.borderB} px-5 py-4 flex items-center justify-between`}>
            <h2 className={c.h2}>Compromissos pendentes</h2>
            {unpaid.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                {unpaid.length}
              </span>
            )}
          </div>
          <div className="px-5 py-2">
            {unpaid.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                Todas as obrigações estão em dia{getGreetingSuffix(gender)}. Excelente gestão.
              </p>
            ) : (
              <ul className={c.divider}>
                {unpaid.map((e) => {
                  const badge = dueBadge(e.due_date)
                  return (
                    <li key={e.id} className="py-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-main truncate flex-1">{e.description}</p>
                        <MaskedValue value={Number(e.amount || 0)} className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums shrink-0" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                        {e.category && <span className="text-xs text-muted">{e.category}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
