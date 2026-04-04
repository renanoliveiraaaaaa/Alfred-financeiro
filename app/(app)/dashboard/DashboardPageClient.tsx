'use client'

import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { resolveActiveOrganizationIdForClient } from '@/lib/activeOrganizationClient'
import { useActiveOrganizationRevision } from '@/lib/useActiveOrganizationRevision'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { seedCategoriesIfEmpty } from '@/lib/seedCategories'
import { formatDate, getGreeting, getMonthYearLabel } from '@/lib/format'
import {
  getCalendarMonthRange,
  getCurrentCalendarMonth,
  isMonthAfterNow,
  isSameMonthAsNow,
  shiftCalendarMonth,
} from '@/lib/monthRange'
import { useGreetingPronoun, getGreetingWithName, getGreetingSuffix } from '@/lib/greeting'
import MaskedValue from '@/components/MaskedValue'
import WelcomeModal, { shouldShowWelcomeModal } from '@/components/WelcomeModal'
import AttentionPanel from '@/components/AttentionPanel'
import BudgetsPanel from '@/components/BudgetsPanel'
import { useUserPreferences } from '@/lib/userPreferencesContext'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { RefreshCw, Loader2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import BuyingPowerCard from '@/components/dashboard/BuyingPowerCard'
import SubscriptionWasteRadar from '@/components/dashboard/SubscriptionWasteRadar'
import {
  auditSubscriptions,
  computeBuyingPower,
  threeMonthWindowEnd,
} from '@/lib/lifestyleFinance'
import type { Database } from '@/types/supabase'

type Revenue = Database['public']['Tables']['revenues']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']
type Subscription = Database['public']['Tables']['subscriptions']['Row']
type IncomeSource = Database['public']['Tables']['income_sources']['Row']
type Goal = Database['public']['Tables']['goals']['Row']

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

export default function DashboardPageClient({ children }: { children?: ReactNode }) {
  const supabase = createSupabaseClient()
  const orgRevision = useActiveOrganizationRevision()
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
  const [goals, setGoals] = useState<Goal[]>([])
  const [expensesThreeMonthWindow, setExpensesThreeMonthWindow] = useState<Expense[]>([])
  const [allActiveSubscriptions, setAllActiveSubscriptions] = useState<Subscription[]>([])

  const [viewMonth, setViewMonth] = useState(getCurrentCalendarMonth)
  const [monthBusy, setMonthBusy] = useState(false)
  const isInitialLoad = useRef(true)

  const monthLabel = useMemo(
    () => getMonthYearLabel(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month]
  )

  const nextMonthNav = useMemo(
    () => shiftCalendarMonth(viewMonth.year, viewMonth.month, 1),
    [viewMonth.year, viewMonth.month]
  )
  const prevMonthNav = useMemo(
    () => shiftCalendarMonth(viewMonth.year, viewMonth.month, -1),
    [viewMonth.year, viewMonth.month]
  )
  const canGoNext = !isMonthAfterNow(nextMonthNav.year, nextMonthNav.month)
  /** Não navegar antes de jan/2000 */
  const canGoPrev = prevMonthNav.year > 2000 || (prevMonthNav.year === 2000 && prevMonthNav.month >= 1)

  const balance = totalRevenues - totalExpenses
  const budgetPercent = projectedExpenses > 0 ? (totalExpenses / projectedExpenses) * 100 : 0

  const buyingPower = useMemo(() => {
    const { start: monthStart, end: monthEnd } = getCalendarMonthRange(
      viewMonth.year,
      viewMonth.month,
    )
    const monthExpenses = expensesThreeMonthWindow.filter(
      (e) => e.due_date && e.due_date >= monthStart && e.due_date <= monthEnd,
    )
    return computeBuyingPower({
      totalRevenues,
      monthExpenses,
      goals,
      viewYear: viewMonth.year,
      viewMonth1to12: viewMonth.month,
    })
  }, [totalRevenues, expensesThreeMonthWindow, goals, viewMonth.year, viewMonth.month])

  const subscriptionAlerts = useMemo(
    () =>
      auditSubscriptions(
        allActiveSubscriptions,
        expensesThreeMonthWindow,
        viewMonth.year,
        viewMonth.month,
      ),
    [allActiveSubscriptions, expensesThreeMonthWindow, viewMonth.year, viewMonth.month],
  )

  useEffect(() => {
    const load = async () => {
      if (isInitialLoad.current) {
        setLoading(true)
      } else {
        setMonthBusy(true)
      }
      setError(null)
      try {
        const { data: userData } = await supabase.auth.getUser()
        setUserEmail(userData.user?.email ?? '')

        if (userData.user && isInitialLoad.current) {
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

        if (!userData.user) {
          setTotalRevenues(0)
          setTotalExpenses(0)
          setMovements([])
          setUnpaid([])
          setDueSubs([])
          setDueIncomeSources([])
          setGoals([])
          setExpensesThreeMonthWindow([])
          setAllActiveSubscriptions([])
          return
        }

        const activeOrgId = await resolveActiveOrganizationIdForClient(supabase, userData.user.id)
        if (!activeOrgId) {
          throw new Error('Não foi possível determinar a organização ativa. Tente recarregar a página.')
        }

        const { start: monthStart, end: monthEnd } = getCalendarMonthRange(viewMonth.year, viewMonth.month)
        const today = new Date().toISOString().slice(0, 10)
        const win3 = threeMonthWindowEnd(viewMonth.year, viewMonth.month)

        const [
          revRes,
          expRes,
          projRes,
          unpaidRes,
          subsAllRes,
          incomeRes,
          goalsRes,
          expWinRes,
        ] = await Promise.all([
          supabase
            .from('revenues')
            .select('*')
            .eq('organization_id', activeOrgId)
            .gte('date', monthStart)
            .lte('date', monthEnd)
            .order('date', { ascending: false }),
          supabase
            .from('expenses')
            .select('*')
            .eq('organization_id', activeOrgId)
            .gte('due_date', monthStart)
            .lte('due_date', monthEnd)
            .order('due_date', { ascending: false }),
          supabase
            .from('projections')
            .select('projected_expenses')
            .eq('organization_id', activeOrgId)
            .eq('month', monthStart)
            .maybeSingle(),
          supabase
            .from('expenses')
            .select('*')
            .eq('organization_id', activeOrgId)
            .eq('paid', false)
            .order('due_date', { ascending: true })
            .limit(10),
          supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userData.user.id)
            .eq('organization_id', activeOrgId)
            .eq('active', true)
            .order('next_billing_date', { ascending: true }),
          supabase
            .from('income_sources')
            .select('*')
            .eq('organization_id', activeOrgId)
            .eq('active', true)
            .lte('next_receipt_date', today)
            .order('next_receipt_date', { ascending: true }),
          supabase.from('goals').select('*').eq('user_id', userData.user.id).eq('organization_id', activeOrgId),
          supabase
            .from('expenses')
            .select('*')
            .eq('organization_id', activeOrgId)
            .gte('due_date', win3.start)
            .lte('due_date', win3.end),
        ])

        if (revRes.error) throw revRes.error
        if (expRes.error) throw expRes.error
        if (projRes.error) throw projRes.error
        if (subsAllRes.error) throw subsAllRes.error

        const revenues = (revRes.data ?? []) as Revenue[]
        const expenses = (expRes.data ?? []) as Expense[]

        const tRev = revenues.reduce((s, r) => s + Number(r.amount || 0), 0)
        const tExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
        setTotalRevenues(tRev)
        setTotalExpenses(tExp)
        setProjectedExpenses(Number(projRes.data?.projected_expenses || 0))
        setUnpaid((unpaidRes.data ?? []) as Expense[])

        const subsAll = (subsAllRes.data ?? []) as Subscription[]
        setAllActiveSubscriptions(subsAll)
        setDueSubs(
          subsAll
            .filter((s) => s.next_billing_date <= today)
            .sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date)),
        )

        setDueIncomeSources((incomeRes.data ?? []) as IncomeSource[])
        setGoals(goalsRes.error ? [] : ((goalsRes.data ?? []) as Goal[]))
        setExpensesThreeMonthWindow(
          expWinRes.error ? [] : ((expWinRes.data ?? []) as Expense[]),
        )

        const revMoves: Movement[] = revenues.map((r) => ({
          id: r.id,
          type: 'revenue',
          description: r.description,
          amount: Number(r.amount || 0),
          date: r.date,
          status: r.received ? 'Recebida' : 'Pendente',
        }))
        const expMoves: Movement[] = expenses.map((e) => ({
          id: e.id,
          type: 'expense',
          description: e.description,
          amount: Number(e.amount || 0),
          date: e.due_date || e.created_at?.slice(0, 10) || '',
          status: e.paid ? 'Quitada' : 'Em aberto',
        }))
        setMovements([...revMoves, ...expMoves].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40))
      } catch (err: any) {
        console.error(err)
        setError(err?.message || 'Falha ao carregar dados do patrimônio.')
      } finally {
        if (isInitialLoad.current) {
          setLoading(false)
          isInitialLoad.current = false
        } else {
          setMonthBusy(false)
        }
      }
    }
    load()
  }, [supabase, viewMonth.year, viewMonth.month, orgRevision])

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

      const organizationId = await resolveActiveOrganizationIdForClient(supabase, userData.user.id)
      if (!organizationId) {
        toastError('Não foi possível determinar a organização ativa.')
        return
      }

      const { error: insertErr } = await supabase.from('expenses').insert({
        user_id: userData.user.id,
        organization_id: organizationId,
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

      const organizationId = await resolveActiveOrganizationIdForClient(supabase, userData.user.id)
      if (!organizationId) {
        toastError('Não foi possível determinar a organização ativa.')
        return
      }

      const today = new Date().toISOString().slice(0, 10)

      const { error: insertErr } = await supabase.from('revenues').insert({
        user_id: userData.user.id,
        organization_id: organizationId,
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

  const goPrevMonth = () => {
    if (!canGoPrev || monthBusy) return
    setViewMonth((v) => shiftCalendarMonth(v.year, v.month, -1))
  }
  const goNextMonth = () => {
    if (!canGoNext || monthBusy) return
    setViewMonth((v) => shiftCalendarMonth(v.year, v.month, 1))
  }
  const goCurrentMonth = () => {
    if (monthBusy) return
    setViewMonth(getCurrentCalendarMonth())
  }

  const c = {
    card: 'rounded-xl border border-border bg-surface transition-colors glass-card',
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
        {children}
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
      {children}
      <WelcomeModal open={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} pronoun={pronoun} />

      <div>
        <h1 className={c.h1}>
          {getGreetingWithName(getGreeting(), firstName || '', gender)}!
        </h1>
        <p className={`${c.sub} mt-0.5`}>Visão geral do patrimônio — período selecionado abaixo</p>
      </div>

      {/* Navegação por mês (receitas/despesas do período) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-surface px-4 py-3 glass-card">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 justify-center sm:justify-start">
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={!canGoPrev || monthBusy}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-main hover:bg-border/40 disabled:opacity-40 disabled:pointer-events-none transition-colors touch-manipulation"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-center sm:items-stretch sm:flex-row sm:gap-3 px-2 text-center sm:text-left">
            <span className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-main truncate">
              <CalendarDays className="h-4 w-4 shrink-0 text-brand" aria-hidden />
              {monthLabel}
            </span>
            <span className="text-xs text-muted hidden sm:inline sm:mt-0.5">
              Entradas e saídas com data neste mês
            </span>
          </div>
          <button
            type="button"
            onClick={goNextMonth}
            disabled={!canGoNext || monthBusy}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-main hover:bg-border/40 disabled:opacity-40 disabled:pointer-events-none transition-colors touch-manipulation"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 sm:shrink-0">
          {!isSameMonthAsNow(viewMonth.year, viewMonth.month) && (
            <button
              type="button"
              onClick={goCurrentMonth}
              disabled={monthBusy}
              className="inline-flex items-center justify-center rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-medium text-brand hover:bg-brand/20 disabled:opacity-50 transition-colors touch-manipulation min-h-[44px]"
            >
              Ir para mês atual
            </button>
          )}
          {monthBusy && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Atualizando…
            </span>
          )}
        </div>
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

      <section
        className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 relative transition-opacity ${
          monthBusy ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <div className={`${c.card} p-4 glass-interactive`}>
          <p className={c.label}>Saldo do mês</p>
          <MaskedValue value={balance} className={`mt-1.5 text-2xl font-semibold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
        </div>
        <div className={`${c.card} p-4 glass-interactive`}>
          <p className={c.label}>Entradas</p>
          <MaskedValue value={totalRevenues} className="mt-1.5 text-2xl font-semibold text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className={`${c.card} p-4 glass-interactive`}>
          <p className={c.label}>Saídas</p>
          <MaskedValue value={totalExpenses} className="mt-1.5 text-2xl font-semibold text-red-600 dark:text-red-400" />
        </div>
        <div className={`${c.card} p-4 glass-interactive`}>
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

      <section
        className={`grid gap-4 relative transition-opacity ${
          subscriptionAlerts.length > 0 ? 'lg:grid-cols-2' : ''
        } ${monthBusy ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <BuyingPowerCard data={buyingPower} monthLabel={monthLabel} />
        <SubscriptionWasteRadar alerts={subscriptionAlerts} />
      </section>

      <BudgetsPanel />

      <section
        className={`grid gap-6 lg:grid-cols-5 relative transition-opacity ${
          monthBusy ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <div className={`lg:col-span-3 ${c.card}`}>
          <div className={`${c.borderB} px-5 py-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between`}>
            <h2 className={c.h2}>Movimentações — {monthLabel}</h2>
            <div className="flex gap-3">
              <Link href="/revenues" className="text-xs text-brand hover:opacity-80 transition-colors">Entradas</Link>
              <Link href="/expenses" className="text-xs text-brand hover:opacity-80 transition-colors">Saídas</Link>
            </div>
          </div>
          <div className="px-5 py-2">
            {movements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                Nenhuma entrada ou saída com data em {monthLabel}
                {getGreetingSuffix(gender)}. Use as setas acima para ver outros meses.
              </p>
            ) : (
              <ul className={`${c.divider} max-h-[min(28rem,55vh)] overflow-y-auto overscroll-contain`}>
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
