'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatCurrency } from '@/lib/format'
import { useGreetingPronoun } from '@/lib/greeting'
import CurrencyInput from '@/components/CurrencyInput'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'

type Projection = {
  id: string
  projected_expenses: number
  projected_revenues: number
  actual_expenses: number
  actual_revenues: number
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function firstOfMonth(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

function lastOfMonth(year: number, month: number) {
  const d = new Date(year, month + 1, 0)
  return d.toISOString().slice(0, 10)
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

export default function ProjectionsPage() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()
  const pronoun = useGreetingPronoun()
  const now = new Date()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [projection, setProjection] = useState<Projection | null>(null)
  const [actualRevenues, setActualRevenues] = useState(0)
  const [actualExpenses, setActualExpenses] = useState(0)

  const [projRev, setProjRev] = useState(0)
  const [projExp, setProjExp] = useState(0)

  const monthStr = useMemo(() => firstOfMonth(year, month), [year, month])
  const lastDay = useMemo(() => lastOfMonth(year, month), [year, month])
  const label = useMemo(() => monthLabel(new Date(year, month)), [year, month])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const [projRes, revRes, expRes] = await Promise.all([
        supabase
          .from('projections')
          .select('*')
          .eq('month', monthStr)
          .maybeSingle(),
        supabase
          .from('revenues')
          .select('amount')
          .gte('date', monthStr)
          .lte('date', lastDay),
        supabase
          .from('expenses')
          .select('amount')
          .gte('due_date', monthStr)
          .lte('due_date', lastDay),
      ])

      if (projRes.error) throw projRes.error

      const proj = projRes.data as Projection | null
      setProjection(proj)
      setProjRev(Number(proj?.projected_revenues) || 0)
      setProjExp(Number(proj?.projected_expenses) || 0)

      const totalRev = (revRes.data ?? []).reduce(
        (s: number, r: { amount: number }) => s + Number(r.amount || 0),
        0
      )
      const totalExp = (expRes.data ?? []).reduce(
        (s: number, e: { amount: number }) => s + Number(e.amount || 0),
        0
      )
      setActualRevenues(totalRev)
      setActualExpenses(totalExp)
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao carregar projeções.')
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }, [supabase, monthStr, lastDay])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    if (projRev < 0 || projExp < 0) {
      setError('Os valores não podem ser negativos.')
      return
    }

    setSaving(true)
    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !userData.user) throw new Error('Usuário não autenticado.')

      const payload = {
        user_id: userData.user.id,
        month: monthStr,
        projected_revenues: projRev,
        projected_expenses: projExp,
        actual_revenues: actualRevenues,
        actual_expenses: actualExpenses,
      }

      if (projection) {
        const { error: upErr } = await supabase
          .from('projections')
          .update({
            projected_revenues: projRev,
            projected_expenses: projExp,
          })
          .eq('id', projection.id)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase.from('projections').insert(payload)
        if (insErr) throw insErr
      }

      setSuccess(`Metas registradas com distinção, ${pronoun}.`)
      await loadData()
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao salvar orçamento.')
      setError(msg)
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  const projectedRevenues = projRev
  const projectedExpenses = projExp
  const expPercent = projectedExpenses > 0 ? (actualExpenses / projectedExpenses) * 100 : 0
  const revPercent = projectedRevenues > 0 ? (actualRevenues / projectedRevenues) * 100 : 0

  const expBarColor =
    expPercent > 100 ? 'bg-red-500' : expPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
  const revBarColor = 'bg-emerald-500'

  // Navegação de mês
  const goPrev = () => {
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
  }
  const goNext = () => {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
  }

  return (
    <div className="max-w-3xl space-y-6 bg-background rounded-xl p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-main">Planejamento Patrimonial</h1>
        <p className="text-sm text-muted mt-0.5">
          Defina metas e acompanhe a execução do seu orçamento, {pronoun}
        </p>
      </div>

      {/* Seletor de mês */}
      <div className="flex items-center gap-3">
        <button
          onClick={goPrev}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:bg-background transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-main capitalize min-w-[160px] text-center">
          {label}
        </span>
        <button
          onClick={goNext}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:bg-background transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-6 animate-pulse">
              <div className="h-4 w-32 bg-border rounded mb-4" />
              <div className="h-8 bg-border rounded mb-3" />
              <div className="h-3 bg-border rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Cards de Entradas vs Saídas */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Entradas */}
            <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
              <h2 className="text-sm font-semibold text-main">Entradas</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Projetado</span>
                  <span className="font-medium text-main">
                    {projectedRevenues > 0 ? formatCurrency(projectedRevenues) : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Realizado</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(actualRevenues)}
                  </span>
                </div>
              </div>
              {projectedRevenues > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>{Math.round(revPercent)}% atingido</span>
                    <span>
                      {actualRevenues >= projectedRevenues ? `Meta atingida, ${pronoun}!` : `Restam ${formatCurrency(projectedRevenues - actualRevenues)}`}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${revBarColor}`}
                      style={{ width: `${clamp(revPercent, 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Saídas */}
            <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
              <h2 className="text-sm font-semibold text-main">Saídas</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Limite definido</span>
                  <span className="font-medium text-main">
                    {projectedExpenses > 0 ? formatCurrency(projectedExpenses) : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Gasto efetivo</span>
                  <span className={`font-semibold ${expPercent > 100 ? 'text-red-600 dark:text-red-400' : 'text-main'}`}>
                    {formatCurrency(actualExpenses)}
                  </span>
                </div>
              </div>
              {projectedExpenses > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>{Math.round(expPercent)}% consumido</span>
                    <span>
                      {expPercent > 100
                        ? `Excedido em ${formatCurrency(actualExpenses - projectedExpenses)}`
                        : `Margem restante: ${formatCurrency(projectedExpenses - actualExpenses)}`}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${expBarColor}`}
                      style={{ width: `${clamp(expPercent, 0, 100)}%` }}
                    />
                  </div>
                  {expPercent > 80 && expPercent <= 100 && (
                    <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                      ⚠ Atenção: você já usou {Math.round(expPercent)}% do orçamento.
                    </p>
                  )}
                  {expPercent > 100 && (
                    <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                      🚨 Orçamento ultrapassado em {formatCurrency(actualExpenses - projectedExpenses)}!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Saldo projetado vs efetivo */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-main mb-3">Balanço do período</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Saldo projetado</p>
                <p className={`text-lg font-semibold mt-0.5 ${
                  projectedRevenues - projectedExpenses >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {projectedRevenues > 0 || projectedExpenses > 0
                    ? formatCurrency(projectedRevenues - projectedExpenses)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Saldo efetivo</p>
                <p className={`text-lg font-semibold mt-0.5 ${
                  actualRevenues - actualExpenses >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(actualRevenues - actualExpenses)}
                </p>
              </div>
            </div>
          </div>

          {/* Formulário de metas */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-main">Definir orçamento</h2>
              <p className="text-xs text-muted mt-0.5">
                {projection ? 'Ajuste as metas' : 'Estabeleça as metas'} para {label}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="projRev" className="block text-sm font-medium text-muted mb-1">
                  Entrada projetada (R$)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted text-sm">R$</span>
                  <CurrencyInput
                    id="projRev"
                    value={projRev}
                    onChange={setProjRev}
                    placeholder="0,00"
                    className="block w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm text-main placeholder-muted focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="projExp" className="block text-sm font-medium text-muted mb-1">
                  Limite de saídas (R$)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted text-sm">R$</span>
                  <CurrencyInput
                    id="projExp"
                    value={projExp}
                    onChange={setProjExp}
                    placeholder="0,00"
                    className="block w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm text-main placeholder-muted focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 transition-colors"
            >
              {saving ? 'Processando...' : projection ? 'Atualizar metas' : 'Registrar metas'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
