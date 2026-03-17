'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatCurrency, formatDate } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import CardBrandIcon from '@/components/CardBrandIcon'
import CardChipIcon from '@/components/CardChipIcon'
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Loader2 } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Card = Database['public']['Tables']['credit_cards']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']

type MonthGroup = {
  key: string
  label: string
  total: number
  expenses: Expense[]
  allPaid: boolean
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${months[parseInt(m) - 1]} ${y}`
}

export default function CreditCardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const cardId = params.id as string

  const [card, setCard] = useState<Card | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [payingAll, setPayingAll] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data: cardData, error: cardErr } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', cardId)
      .maybeSingle()

    if (cardErr || !cardData) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setCard(cardData as Card)

    const { data: expData } = await supabase
      .from('expenses')
      .select('*')
      .eq('credit_card_id', cardId)
      .order('due_date', { ascending: false })

    setExpenses((expData ?? []) as Expense[])
    setLoading(false)
  }, [supabase, cardId])

  useEffect(() => { fetchData() }, [fetchData])

  const monthGroups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, Expense[]>()
    expenses.forEach((e) => {
      const d = e.due_date || e.created_at?.slice(0, 10) || ''
      const key = d.slice(0, 7)
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
        expenses: exps.sort((a, b) => (b.due_date || '').localeCompare(a.due_date || '')),
        allPaid: exps.every((e) => e.paid),
      }))
  }, [expenses])

  const [selectedMonth, setSelectedMonth] = useState<string>('')

  useEffect(() => {
    if (monthGroups.length > 0 && !selectedMonth) {
      setSelectedMonth(monthGroups[0].key)
    }
  }, [monthGroups, selectedMonth])

  const currentGroup = monthGroups.find((g) => g.key === selectedMonth) || null
  const currentIdx = monthGroups.findIndex((g) => g.key === selectedMonth)

  const handlePayAll = async () => {
    if (!currentGroup) return
    if (!window.confirm(`Deseja marcar todas as ${currentGroup.expenses.length} despesas da fatura de ${currentGroup.label} como pagas, senhor?`)) return

    setPayingAll(true)
    const ids = currentGroup.expenses.filter((e) => !e.paid).map((e) => e.id)

    if (ids.length > 0) {
      const { error } = await supabase
        .from('expenses')
        .update({ paid: true })
        .in('id', ids)

      if (!error) {
        setExpenses((prev) =>
          prev.map((e) => ids.includes(e.id) ? { ...e, paid: true } : e)
        )
      }
    }
    setPayingAll(false)
  }

  const cls = {
    card: 'rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 transition-colors',
    h1: 'text-xl font-semibold text-gray-900 dark:text-white',
    h2: 'text-sm font-semibold text-gray-900 dark:text-white',
    sub: 'text-sm text-gray-500 dark:text-manor-400',
    label: 'text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-manor-500',
    divider: 'divide-y divide-gray-100 dark:divide-manor-800',
    borderB: 'border-b border-gray-100 dark:border-manor-800',
    skel: 'bg-gray-200 dark:bg-manor-800 rounded animate-pulse',
    btnPrimary: 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gold-600 dark:bg-gold-500 text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 disabled:opacity-50 transition-colors',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className={`h-6 w-48 ${cls.skel}`} />
        <div className={`h-40 ${cls.skel} rounded-2xl`} />
        <div className={`${cls.card} p-6 space-y-4`}>
          {[1, 2, 3, 4].map((i) => <div key={i} className={`h-12 ${cls.skel}`} />)}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={`${cls.card} p-12 text-center`}>
        <CreditCard className="h-12 w-12 mx-auto text-gray-300 dark:text-manor-700 mb-4" />
        <p className="text-gray-500 dark:text-manor-400 mb-4">Cartão não encontrado, senhor.</p>
        <Link href="/credit-cards" className={cls.btnPrimary}>Retornar à carteira</Link>
      </div>
    )
  }

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
  const gradient = card ? (GRADIENTS[card.color] || GRADIENTS.slate) : ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/credit-cards" className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 text-gray-500 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className={cls.h1}>{card?.name}</h1>
          <p className={cls.sub}>{card?.brand || 'Cartão de crédito'} · Fecha dia {card?.closing_day} · Vence dia {card?.due_day}</p>
        </div>
      </div>

      {/* Mini card visual */}
      <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg relative overflow-hidden max-w-sm`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <CardChipIcon size={28} className="text-white/50" />
            <CardBrandIcon brand={card?.brand} size="md" className="text-white/90" />
          </div>
          <div>
            <p className="text-xs text-white/50 mb-0.5">Limite disponível</p>
            <MaskedValue
              value={Number(card?.credit_limit || 0)}
              className="text-2xl font-semibold tracking-tight"
            />
          </div>
        </div>
      </div>

      {/* Faturas */}
      {monthGroups.length === 0 ? (
        <div className={`${cls.card} p-12 text-center`}>
          <p className="text-gray-400 dark:text-manor-500 text-sm">
            Nenhuma despesa vinculada a este cartão no momento, senhor.
          </p>
        </div>
      ) : (
        <>
          {/* Month nav */}
          <div className={`${cls.card} p-4 flex items-center justify-between`}>
            <button
              onClick={() => currentIdx < monthGroups.length - 1 && setSelectedMonth(monthGroups[currentIdx + 1].key)}
              disabled={currentIdx >= monthGroups.length - 1}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Fatura de {currentGroup?.label}
              </p>
              <MaskedValue
                value={currentGroup?.total || 0}
                className={`text-lg font-bold ${currentGroup?.allPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
              />
            </div>
            <button
              onClick={() => currentIdx > 0 && setSelectedMonth(monthGroups[currentIdx - 1].key)}
              disabled={currentIdx <= 0}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Pay all button */}
          {currentGroup && !currentGroup.allPaid && (
            <button
              onClick={handlePayAll}
              disabled={payingAll}
              className={cls.btnPrimary}
            >
              {payingAll ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processando fatura...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Pagar fatura completa ({currentGroup.expenses.filter(e => !e.paid).length} pendente{currentGroup.expenses.filter(e => !e.paid).length > 1 ? 's' : ''})</>
              )}
            </button>
          )}

          {currentGroup?.allPaid && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Fatura integralmente quitada, senhor. Excelente gestão.
            </div>
          )}

          {/* Expenses list */}
          <div className={cls.card}>
            <div className={`${cls.borderB} px-5 py-3`}>
              <p className={cls.label}>{currentGroup?.expenses.length} lançamento{(currentGroup?.expenses.length || 0) > 1 ? 's' : ''}</p>
            </div>
            <ul className={`${cls.divider}`}>
              {currentGroup?.expenses.map((exp) => (
                <li key={exp.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${exp.paid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {exp.description}
                      {exp.installment_number && exp.installments && (
                        <span className="ml-1.5 text-xs text-gray-400 dark:text-manor-500 font-normal">
                          {exp.installment_number}/{exp.installments}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-manor-500">
                      {formatDate(exp.due_date)} · {exp.category || '—'}
                    </p>
                  </div>
                  <MaskedValue
                    value={Number(exp.amount || 0)}
                    className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums"
                  />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
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
        </>
      )}
    </div>
  )
}
