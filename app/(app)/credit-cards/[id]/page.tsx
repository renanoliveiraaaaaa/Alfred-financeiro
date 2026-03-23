'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatDate } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import CardBrandIcon from '@/components/CardBrandIcon'
import CardChipIcon from '@/components/CardChipIcon'
import ConfirmDangerModal from '@/components/ConfirmDangerModal'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Plus,
  Circle,
} from 'lucide-react'
import type { Database } from '@/types/supabase'

type Card = Database['public']['Tables']['credit_cards']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']

const GRADIENTS: Record<string, string> = {
  slate: 'from-gray-700 via-gray-800 to-gray-900',
  black: 'from-zinc-800 via-neutral-900 to-black',
  gold: 'from-amber-700 via-yellow-800 to-amber-900',
  navy: 'from-blue-800 via-blue-900 to-slate-900',
  sky: 'from-sky-600 via-blue-700 to-blue-800',
  emerald: 'from-emerald-700 via-emerald-800 to-emerald-900',
  teal: 'from-teal-600 via-teal-700 to-teal-900',
  rose: 'from-rose-700 via-rose-800 to-rose-900',
  red: 'from-red-700 via-red-800 to-red-900',
  purple: 'from-purple-700 via-purple-800 to-purple-900',
  indigo: 'from-indigo-700 via-indigo-800 to-indigo-900',
  orange: 'from-orange-600 via-orange-700 to-amber-800',
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${y}`
}

/** Dias até a próxima ocorrência de um dia do mês */
function daysUntilDay(day: number): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let target = new Date(today.getFullYear(), today.getMonth(), day)
  if (target <= today) {
    target = new Date(today.getFullYear(), today.getMonth() + 1, day)
  }
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

const CATEGORY_LABELS: Record<string, string> = {
  mercado: 'Mercado', alimentacao: 'Alimentação', compras: 'Compras', transporte: 'Transporte',
  combustivel: 'Combustível', veiculo: 'Veículo', assinaturas: 'Assinaturas', saude: 'Saúde',
  educacao: 'Educação', lazer: 'Lazer', moradia: 'Moradia', fatura_cartao: 'Fatura', outros: 'Outros',
}

export default function CreditCardDetailPage() {
  const params = useParams()
  const supabase = createSupabaseClient()
  const { toast, toastError } = useToast()
  const pronoun = useGreetingPronoun()
  const cardId = params.id as string

  const [card, setCard] = useState<Card | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Pagar fatura (todos)
  const [showPayAllConfirm, setShowPayAllConfirm] = useState(false)
  const [payingAll, setPayingAll] = useState(false)

  // Toggle individual
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: cardData, error: cardErr }, { data: expData }] = await Promise.all([
      supabase.from('credit_cards').select('*').eq('id', cardId).maybeSingle(),
      supabase.from('expenses').select('*').eq('credit_card_id', cardId).order('due_date', { ascending: false }),
    ])

    if (cardErr || !cardData) { setNotFound(true); setLoading(false); return }
    setCard(cardData as Card)
    setExpenses((expData ?? []) as Expense[])
    setLoading(false)
  }, [supabase, cardId])

  useEffect(() => { fetchData() }, [fetchData])

  // Agrupa por mês
  const monthGroups = useMemo(() => {
    const map = new Map<string, Expense[]>()
    expenses.forEach((e) => {
      const key = (e.due_date || e.created_at?.slice(0, 10) || '').slice(0, 7)
      if (!key) return
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, exps]) => ({
        key,
        label: monthLabel(key),
        total: exps.reduce((s, e) => s + Number(e.amount || 0), 0),
        paid: exps.filter((e) => e.paid).reduce((s, e) => s + Number(e.amount || 0), 0),
        pending: exps.filter((e) => !e.paid).reduce((s, e) => s + Number(e.amount || 0), 0),
        expenses: exps.sort((a, b) => (b.due_date || '').localeCompare(a.due_date || '')),
        allPaid: exps.every((e) => e.paid),
        pendingCount: exps.filter((e) => !e.paid).length,
      }))
  }, [expenses])

  const [selectedMonth, setSelectedMonth] = useState('')
  useEffect(() => {
    if (monthGroups.length > 0 && !selectedMonth) setSelectedMonth(monthGroups[0].key)
  }, [monthGroups, selectedMonth])

  const currentGroup = monthGroups.find((g) => g.key === selectedMonth) ?? null
  const currentIdx = monthGroups.findIndex((g) => g.key === selectedMonth)

  // Utilização do mês selecionado vs limite
  const utilPct = card && currentGroup
    ? Math.min((currentGroup.total / Number(card.credit_limit || 1)) * 100, 100)
    : 0

  const handlePayAll = async () => {
    if (!currentGroup) return
    setPayingAll(true)
    const ids = currentGroup.expenses.filter((e) => !e.paid).map((e) => e.id)
    if (ids.length > 0) {
      const { error } = await supabase.from('expenses').update({ paid: true }).in('id', ids)
      if (error) toastError(isConnectionError(error) ? CONNECTION_ERROR_MSG : error.message)
      else {
        setExpenses((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, paid: true } : e))
        toast(`Fatura de ${currentGroup.label} quitada.`, 'success')
      }
    }
    setPayingAll(false)
    setShowPayAllConfirm(false)
  }

  const handleTogglePaid = async (exp: Expense) => {
    setTogglingId(exp.id)
    const newPaid = !exp.paid
    const { error } = await supabase.from('expenses').update({ paid: newPaid }).eq('id', exp.id)
    if (error) toastError(isConnectionError(error) ? CONNECTION_ERROR_MSG : error.message)
    else setExpenses((prev) => prev.map((e) => e.id === exp.id ? { ...e, paid: newPaid } : e))
    setTogglingId(null)
  }

  const cls = {
    surface: 'rounded-xl border border-border bg-surface glass-card',
    btnPrimary: 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50 transition-colors',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-border rounded animate-pulse" />
        <div className="h-44 bg-border rounded-2xl animate-pulse max-w-sm" />
        <div className={`${cls.surface} p-6 space-y-4`}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-border rounded animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={`${cls.surface} p-12 text-center`}>
        <CreditCard className="h-12 w-12 mx-auto text-muted mb-4" />
        <p className="text-muted mb-4">Cartão não encontrado{pronoun ? `, ${pronoun}` : ''}.</p>
        <Link href="/credit-cards" className={cls.btnPrimary}>Voltar à carteira</Link>
      </div>
    )
  }

  const gradient = GRADIENTS[card?.color ?? ''] || GRADIENTS.slate
  const daysToClose = card ? daysUntilDay(card.closing_day) : null
  const daysToDue = card ? daysUntilDay(card.due_day) : null

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <Link
          href="/credit-cards"
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-surface text-muted hover:bg-background transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-main">{card?.name}</h1>
          <p className="text-sm text-muted mt-0.5">
            {card?.brand || 'Cartão de crédito'}
          </p>
        </div>
        <Link
          href={`/expenses/new?card_id=${cardId}`}
          className={cls.btnPrimary}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Adicionar despesa</span>
        </Link>
      </div>

      {/* ── Card visual + info ── */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Card visual */}
        <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg relative overflow-hidden w-full sm:max-w-[260px] shrink-0`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),transparent_60%)]" />
          <div className="relative space-y-4">
            <div className="flex items-start justify-between">
              <CardChipIcon size={28} className="text-white/50" />
              <CardBrandIcon brand={card?.brand} size="md" className="text-white/90" />
            </div>
            <div>
              <p className="text-xs text-white/50 mb-0.5">Limite total</p>
              <MaskedValue value={Number(card?.credit_limit || 0)} className="text-2xl font-semibold tracking-tight" />
            </div>
            {/* Utilização do mês selecionado */}
            {currentGroup && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-white/50">
                  <span>Fatura {currentGroup.label}</span>
                  <span className={utilPct > 80 ? 'text-red-300' : utilPct > 50 ? 'text-amber-300' : 'text-white/60'}>
                    {utilPct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${utilPct > 80 ? 'bg-red-400' : utilPct > 50 ? 'bg-amber-400' : 'bg-white/70'}`}
                    style={{ width: `${utilPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info: fechamento, vencimento, disponível */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-1 gap-3">
          <div className={`${cls.surface} px-4 py-3`}>
            <p className="text-xs text-muted mb-0.5">Próximo fechamento</p>
            <p className="text-sm font-semibold text-main">Dia {card?.closing_day}</p>
            {daysToClose !== null && (
              <p className="text-xs text-muted mt-0.5">
                em <span className="text-brand font-medium">{daysToClose} dia{daysToClose !== 1 ? 's' : ''}</span>
              </p>
            )}
          </div>
          <div className={`${cls.surface} px-4 py-3`}>
            <p className="text-xs text-muted mb-0.5">Próximo vencimento</p>
            <p className="text-sm font-semibold text-main">Dia {card?.due_day}</p>
            {daysToDue !== null && (
              <p className="text-xs text-muted mt-0.5">
                em <span className={`font-medium ${daysToDue <= 5 ? 'text-red-500' : 'text-brand'}`}>{daysToDue} dia{daysToDue !== 1 ? 's' : ''}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Faturas ── */}
      {monthGroups.length === 0 ? (
        <div className={`${cls.surface} p-12 text-center`}>
          <p className="text-muted text-sm">Nenhuma despesa vinculada a este cartão.</p>
        </div>
      ) : (
        <>
          {/* Abas de mês */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1">
            <button
              onClick={() => currentIdx < monthGroups.length - 1 && setSelectedMonth(monthGroups[currentIdx + 1].key)}
              disabled={currentIdx >= monthGroups.length - 1}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:bg-background disabled:opacity-30 transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {monthGroups.map((g) => (
              <button
                key={g.key}
                onClick={() => setSelectedMonth(g.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  g.key === selectedMonth
                    ? 'bg-brand text-white'
                    : 'text-muted hover:text-main hover:bg-background'
                }`}
              >
                {g.label}
                {!g.allPaid && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-60 align-middle" />
                )}
              </button>
            ))}
            <button
              onClick={() => currentIdx > 0 && setSelectedMonth(monthGroups[currentIdx - 1].key)}
              disabled={currentIdx <= 0}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:bg-background disabled:opacity-30 transition-colors shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Resumo da fatura */}
          {currentGroup && (
            <div className="grid grid-cols-3 gap-3">
              <div className={`${cls.surface} px-4 py-3 text-center`}>
                <p className="text-xs text-muted mb-1">Total da fatura</p>
                <MaskedValue value={currentGroup.total} className="text-base font-bold text-main" />
              </div>
              <div className={`${cls.surface} px-4 py-3 text-center`}>
                <p className="text-xs text-muted mb-1">Pago</p>
                <MaskedValue value={currentGroup.paid} className="text-base font-bold text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className={`${cls.surface} px-4 py-3 text-center`}>
                <p className="text-xs text-muted mb-1">Pendente</p>
                <MaskedValue value={currentGroup.pending} className={`text-base font-bold ${currentGroup.pending > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted'}`} />
              </div>
            </div>
          )}

          {/* Banner fatura paga / botão pagar */}
          {currentGroup?.allPaid ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Fatura de {currentGroup.label} integralmente quitada.
            </div>
          ) : currentGroup && currentGroup.pendingCount > 0 ? (
            <button
              onClick={() => setShowPayAllConfirm(true)}
              className={cls.btnPrimary}
            >
              <CheckCircle2 className="h-4 w-4" />
              Quitar fatura completa ({currentGroup.pendingCount} pendente{currentGroup.pendingCount !== 1 ? 's' : ''})
            </button>
          ) : null}

          {/* Lista de despesas */}
          {currentGroup && (
            <div className={cls.surface}>
              <div className="px-5 py-3 border-b border-border">
                <p className="text-xs font-medium text-muted uppercase tracking-wider">
                  {currentGroup.expenses.length} lançamento{currentGroup.expenses.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ul className="divide-y divide-border">
                {currentGroup.expenses.map((exp) => (
                  <li key={exp.id} className={`px-5 py-3.5 flex items-center gap-3 transition-opacity ${togglingId === exp.id ? 'opacity-50' : ''}`}>
                    {/* Toggle pago */}
                    <button
                      onClick={() => handleTogglePaid(exp)}
                      disabled={togglingId === exp.id}
                      title={exp.paid ? 'Marcar como pendente' : 'Marcar como pago'}
                      className="shrink-0 text-muted hover:text-brand transition-colors"
                    >
                      {togglingId === exp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : exp.paid ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <Link href={`/expenses/${exp.id}`} className="group">
                        <p className={`text-sm font-medium truncate group-hover:text-brand transition-colors ${exp.paid ? 'text-muted line-through' : 'text-main'}`}>
                          {exp.description}
                          {exp.installment_number && exp.installments && (
                            <span className="ml-1.5 text-xs text-muted font-normal no-underline">
                              {exp.installment_number}/{exp.installments}
                            </span>
                          )}
                        </p>
                      </Link>
                      <p className="text-xs text-muted">
                        {formatDate(exp.due_date)}
                        {exp.category && (
                          <> · <span>{CATEGORY_LABELS[exp.category] ?? exp.category}</span></>
                        )}
                      </p>
                    </div>

                    <MaskedValue
                      value={Number(exp.amount || 0)}
                      className={`text-sm font-semibold tabular-nums shrink-0 ${exp.paid ? 'text-muted' : 'text-main'}`}
                    />

                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      exp.paid
                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
                    }`}>
                      {exp.paid ? 'Pago' : 'Aberto'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ── Modal confirmar "Quitar fatura" ── */}
      <ConfirmDangerModal
        open={showPayAllConfirm}
        title="Quitar fatura completa?"
        description={
          currentGroup
            ? `Isso marcará ${currentGroup.pendingCount} despesa${currentGroup.pendingCount !== 1 ? 's' : ''} da fatura de ${currentGroup.label} como pagas. A ação pode ser desfeita individualmente depois.`
            : ''
        }
        confirmLabel="Sim, quitar tudo"
        loading={payingAll}
        onConfirm={handlePayAll}
        onCancel={() => setShowPayAllConfirm(false)}
      />
    </div>
  )
}
