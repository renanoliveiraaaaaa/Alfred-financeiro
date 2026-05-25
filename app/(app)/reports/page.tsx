'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { resolveActiveOrganizationIdForClient } from '@/lib/activeOrganizationClient'
import { useActiveOrganizationRevision } from '@/lib/useActiveOrganizationRevision'
import { useGreetingPronoun } from '@/lib/greeting'
import { formatCurrency } from '@/lib/format'
import { formatDateBR, formatCurrencyBR } from '@/lib/exportCsv'
import ExportMenu from '@/components/ExportMenu'
import MaskedValue from '@/components/MaskedValue'
import { useI18n, type Locale } from '@/lib/i18n'
import { formatMessage } from '@/lib/i18nFormat'
import { buildCategoryLabelsMap } from '@/lib/categoryI18n'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Database } from '@/types/supabase'

const ReportsChartsSection = dynamic(
  () => import('@/components/reports/ReportsChartsSection'),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-6 animate-pulse h-72" />
        ))}
      </div>
    ),
  },
)

type Revenue = Database['public']['Tables']['revenues']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']

const CATEGORY_COLORS: Record<string, string> = {
  mercado: '#10b981',
  alimentacao: '#f97316',
  compras: '#ec4899',
  transporte: '#06b6d4',
  combustivel: '#f59e0b',
  veiculo: '#3b82f6',
  assinaturas: '#8b5cf6',
  saude: '#ef4444',
  educacao: '#14b8a6',
  lazer: '#a855f7',
  moradia: '#64748b',
  fatura_cartao: '#0ea5e9',
  outros: '#6b7280',
}

function shortMonthLabels(locale: Locale): string[] {
  const localeTag = locale === 'en' ? 'en-US' : 'pt-BR'
  return Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleDateString(localeTag, { month: 'short' }),
  )
}

function groupByMonth(items: { amount: number; dateField: string }[]): number[] {
  const months = new Array(12).fill(0)
  items.forEach(({ amount, dateField }) => {
    if (!dateField) return
    const m = parseInt(dateField.slice(5, 7), 10) - 1
    if (m >= 0 && m < 12) months[m] += amount
  })
  return months
}

export default function ReportsPage() {
  const supabase = createSupabaseClient()
  const orgRevision = useActiveOrganizationRevision()
  const { resolvedTheme } = useTheme()
  const pronoun = useGreetingPronoun()
  const { t, locale } = useI18n()
  const CATEGORY_LABELS = useMemo(() => buildCategoryLabelsMap(t), [t])
  const chartMonthLabels = useMemo(() => shortMonthLabels(locale), [locale])
  const [mounted, setMounted] = useState(false)

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [yearRevenues, setYearRevenues] = useState<Revenue[]>([])
  const [yearExpenses, setYearExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: auth } = await supabase.auth.getUser()
        const uid = auth.user?.id
        if (!uid) {
          setRevenues([])
          setExpenses([])
          setYearRevenues([])
          setYearExpenses([])
          return
        }

        const activeOrgId = await resolveActiveOrganizationIdForClient(supabase, uid)
        if (!activeOrgId) {
          setRevenues([])
          setExpenses([])
          setYearRevenues([])
          setYearExpenses([])
          setError('Não foi possível determinar a organização ativa. Tente recarregar a página.')
          return
        }

        const now = new Date()
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        const yearStart = `${year}-01-01`
        const yearEnd = `${year}-12-31`

        const [revMonthRes, expMonthRes, revYearRes, expYearRes] = await Promise.all([
          supabase
            .from('revenues')
            .select('*')
            .eq('organization_id', activeOrgId)
            .gte('date', firstOfMonth)
            .order('date', { ascending: false }),
          supabase
            .from('expenses')
            .select('*')
            .eq('organization_id', activeOrgId)
            .gte('due_date', firstOfMonth)
            .order('due_date', { ascending: false }),
          supabase
            .from('revenues')
            .select('*')
            .eq('organization_id', activeOrgId)
            .gte('date', yearStart)
            .lte('date', yearEnd)
            .order('date', { ascending: true }),
          supabase
            .from('expenses')
            .select('*')
            .eq('organization_id', activeOrgId)
            .gte('due_date', yearStart)
            .lte('due_date', yearEnd)
            .order('due_date', { ascending: true }),
        ])

        if (revMonthRes.error) throw revMonthRes.error
        if (expMonthRes.error) throw expMonthRes.error
        if (revYearRes.error) throw revYearRes.error
        if (expYearRes.error) throw expYearRes.error

        setRevenues((revMonthRes.data ?? []) as Revenue[])
        setExpenses((expMonthRes.data ?? []) as Expense[])
        setYearRevenues((revYearRes.data ?? []) as Revenue[])
        setYearExpenses((expYearRes.data ?? []) as Expense[])
      } catch (err: unknown) {
        console.error('[reports] Erro ao carregar dados:', err instanceof Error ? err.message : err)
        const msg = err instanceof Error ? err.message : t('reports.error.load')
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase, year, orgRevision])

  const isDark = mounted && resolvedTheme === 'dark'

  // Monthly totals (current month)
  const totalRevenues = useMemo(() => revenues.reduce((s, r) => s + Number(r.amount || 0), 0), [revenues])
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount || 0), 0), [expenses])

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of expenses) {
      const cat = e.category || 'outros'
      map[cat] = (map[cat] || 0) + Number(e.amount || 0)
    }
    return map
  }, [expenses])

  // Yearly data
  const yearRevMonths = useMemo(
    () => groupByMonth(yearRevenues.map((r) => ({ amount: Number(r.amount || 0), dateField: r.date }))),
    [yearRevenues]
  )
  const yearExpMonths = useMemo(
    () => groupByMonth(yearExpenses.map((e) => ({ amount: Number(e.amount || 0), dateField: e.due_date || '' }))),
    [yearExpenses]
  )
  const yearTotalRev = yearRevMonths.reduce((a, b) => a + b, 0)
  const yearTotalExp = yearExpMonths.reduce((a, b) => a + b, 0)
  const yearBalance = yearTotalRev - yearTotalExp

  const hasData = revenues.length > 0 || expenses.length > 0
  const hasCategoryData = Object.keys(categoryTotals).length > 0
  const hasYearData = yearRevenues.length > 0 || yearExpenses.length > 0

  const exportSheets = useMemo(() => {
    const localeTag = locale === 'en' ? 'en-US' : 'pt-BR'
    const now = new Date()
    const monthLabel = now.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' })

    const col = {
      indicator: t('reports.export.col.indicator'),
      value: t('reports.export.col.value'),
      date: t('reports.export.col.date'),
      description: t('reports.export.col.description'),
      amount: t('reports.export.col.amount'),
      status: t('reports.export.col.status'),
      category: t('reports.export.col.category'),
      dueDate: t('reports.export.col.dueDate'),
      month: t('reports.export.col.month'),
      balance: t('reports.export.col.balance'),
      revenuesAmount: t('reports.export.col.revenuesAmount'),
      expensesAmount: t('reports.export.col.expensesAmount'),
    }

    const resumo = [
      { [col.indicator]: t('reports.export.row.monthPeriod'), [col.value]: monthLabel },
      { [col.indicator]: t('reports.export.row.monthRevenues'), [col.value]: formatCurrencyBR(totalRevenues) },
      { [col.indicator]: t('reports.export.row.monthExpenses'), [col.value]: formatCurrencyBR(totalExpenses) },
      { [col.indicator]: t('reports.export.row.monthBalance'), [col.value]: formatCurrencyBR(totalRevenues - totalExpenses) },
      { [col.indicator]: t('reports.export.row.year'), [col.value]: String(year) },
      { [col.indicator]: t('reports.export.row.yearRevenues'), [col.value]: formatCurrencyBR(yearTotalRev) },
      { [col.indicator]: t('reports.export.row.yearExpenses'), [col.value]: formatCurrencyBR(yearTotalExp) },
      { [col.indicator]: t('reports.export.row.yearBalance'), [col.value]: formatCurrencyBR(yearBalance) },
    ]

    const receitasAno = yearRevenues.map((r) => ({
      [col.date]: formatDateBR(r.date),
      [col.description]: r.description,
      [col.amount]: formatCurrencyBR(Number(r.amount || 0)),
      [col.status]: r.received ? t('reports.export.status.received') : t('reports.export.status.pending'),
    }))

    const despesasAno = yearExpenses.map((e) => ({
      [col.dueDate]: formatDateBR(e.due_date),
      [col.description]: e.description,
      [col.category]: CATEGORY_LABELS[e.category] ?? e.category,
      [col.amount]: formatCurrencyBR(Number(e.amount || 0)),
      [col.status]: e.paid ? t('reports.export.status.paid') : t('reports.export.status.open'),
    }))

    const categorias = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, total]) => ({
        [col.category]: CATEGORY_LABELS[cat] ?? cat,
        [col.amount]: formatCurrencyBR(total),
      }))

    const evolucao = chartMonthLabels.map((label, i) => ({
      [col.month]: label,
      [col.revenuesAmount]: formatCurrencyBR(yearRevMonths[i] ?? 0),
      [col.expensesAmount]: formatCurrencyBR(yearExpMonths[i] ?? 0),
      [col.balance]: formatCurrencyBR((yearRevMonths[i] ?? 0) - (yearExpMonths[i] ?? 0)),
    }))

    return [
      { name: t('reports.export.sheet.summary'), rows: resumo },
      { name: t('reports.export.sheet.revenues'), rows: receitasAno },
      { name: t('reports.export.sheet.expenses'), rows: despesasAno },
      { name: t('reports.export.sheet.categories'), rows: categorias },
      { name: t('reports.export.sheet.evolution'), rows: evolucao },
    ]
  }, [
    totalRevenues,
    totalExpenses,
    year,
    yearTotalRev,
    yearTotalExp,
    yearBalance,
    yearRevenues,
    yearExpenses,
    categoryTotals,
    yearRevMonths,
    yearExpMonths,
    chartMonthLabels,
    CATEGORY_LABELS,
    t,
    locale,
  ])

  const exportFilename = formatMessage(t('reports.export.filename'), {
    year: String(year),
    date: new Date().toISOString().slice(0, 10),
  })

  // Chart configs
  const baseTooltip = useMemo(() => ({
    backgroundColor: isDark ? '#1a1a1a' : '#fff',
    titleColor: isDark ? '#fff' : '#1f2937',
    bodyColor: isDark ? '#c0c0c0' : '#6b7280',
    borderColor: isDark ? '#333' : '#e5e7eb',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    callbacks: {
      label: (ctx: any) => ` ${formatCurrency(ctx.parsed?.y ?? ctx.raw ?? 0)}`,
    },
  }), [isDark])

  const doughnutData = useMemo(() => ({
    labels: Object.keys(categoryTotals).map((k) => CATEGORY_LABELS[k] ?? k),
    datasets: [{
      data: Object.values(categoryTotals),
      backgroundColor: Object.keys(categoryTotals).map((k) => CATEGORY_COLORS[k] ?? '#6b7280'),
      borderColor: isDark ? '#0a0a0a' : '#fff',
      borderWidth: 2,
      hoverOffset: 6,
    }],
  }), [categoryTotals, isDark])

  const barData = useMemo(() => ({
    labels: [t('reports.chart.revenues'), t('reports.chart.expenses')],
    datasets: [{
      label: t('reports.chart.valueLabel'),
      data: [totalRevenues, totalExpenses],
      backgroundColor: ['#10b981', '#ef4444'],
      borderRadius: 6,
      barPercentage: 0.5,
    }],
  }), [totalRevenues, totalExpenses, t])

  const lineData = useMemo(() => ({
    labels: chartMonthLabels,
    datasets: [
      {
        label: t('reports.chart.revenues'),
        data: yearRevMonths,
        borderColor: '#b59410',
        backgroundColor: 'rgba(181, 148, 16, 0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#b59410',
        pointBorderColor: isDark ? '#0a0a0a' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: t('reports.chart.expenses'),
        data: yearExpMonths,
        borderColor: isDark ? '#c0c0c0' : '#6b7280',
        backgroundColor: isDark ? 'rgba(192, 192, 192, 0.06)' : 'rgba(107, 114, 128, 0.06)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: isDark ? '#c0c0c0' : '#6b7280',
        pointBorderColor: isDark ? '#0a0a0a' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }), [yearRevMonths, yearExpMonths, isDark, t, chartMonthLabels])

  const baseScales = useMemo(() => ({
    y: {
      beginAtZero: true,
      ticks: { color: isDark ? '#888' : '#666', callback: (v: any) => formatCurrency(Number(v)) },
      grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
    },
    x: {
      ticks: { color: isDark ? '#888' : '#666' },
      grid: { display: false },
    },
  }), [isDark])

  const doughnutOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false, cutout: '60%',
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, color: isDark ? '#c0c0c0' : '#6b7280' } },
      tooltip: baseTooltip,
    },
  }), [isDark, baseTooltip])

  const barOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: baseTooltip },
    scales: baseScales,
  }), [baseTooltip, baseScales])

  const lineOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: true, position: 'top' as const, align: 'end' as const, labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, color: isDark ? '#c0c0c0' : '#6b7280', font: { size: 12 } } },
      tooltip: { ...baseTooltip, mode: 'index' as const, intersect: false },
    },
    scales: baseScales,
  }), [isDark, baseTooltip, baseScales])

  const cls = {
    card: 'rounded-xl border border-border bg-surface shadow-sm transition-colors glass-card',
    label: 'text-xs font-medium uppercase tracking-wide text-muted',
    h2: 'text-sm font-semibold text-main',
    skel: 'bg-border rounded animate-pulse',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className={`h-6 w-48 ${cls.skel}`} />
        <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className={`${cls.card} p-4 animate-pulse`}><div className={`h-3 w-16 ${cls.skel} mb-2`} /><div className={`h-6 w-24 ${cls.skel}`} /></div>)}</div>
        <div className="grid gap-6 md:grid-cols-2">{[1, 2].map((i) => <div key={i} className={`${cls.card} p-6 animate-pulse`}><div className={`h-4 w-40 ${cls.skel} mb-6`} /><div className={`h-56 ${cls.skel}`} /></div>)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-main">{t('reports.title')}</h1>
          <p className="text-sm text-muted mt-0.5">{formatMessage(t('reports.subtitle'), { pronoun })}</p>
        </div>
        <ExportMenu
          filename={exportFilename}
          sheets={exportSheets}
          disabled={!hasData && !hasYearData}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      {/* ── SEÇÃO MENSAL ── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">{t('reports.currentPeriod')}</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>{t('reports.revenues')}</p>
            <MaskedValue value={totalRevenues} className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>{t('reports.expenses')}</p>
            <MaskedValue value={totalExpenses} className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400" />
          </div>
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>{t('reports.balance')}</p>
            <MaskedValue value={totalRevenues - totalExpenses} className={`mt-1 text-lg font-semibold ${totalRevenues - totalExpenses >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
        </div>

        {!hasData ? (
          <div className={`${cls.card} p-12 text-center`}>
            <p className="text-muted text-sm">
              {formatMessage(t('reports.emptyMonth'), { pronoun })}
            </p>
          </div>
        ) : (
          <ReportsChartsSection
            cardClass={cls.card}
            h2Class={cls.h2}
            hasData={hasData}
            hasCategoryData={hasCategoryData}
            hasYearData={hasYearData}
            categoryTotals={categoryTotals}
            categoryLabels={CATEGORY_LABELS}
            categoryColors={CATEGORY_COLORS}
            doughnutData={doughnutData}
            doughnutOptions={doughnutOptions}
            barData={barData}
            barOptions={barOptions}
            lineData={lineData}
            lineOptions={lineOptions}
            year={year}
            pronoun={pronoun}
          />
        )}
      </section>

      {/* ── SEÇÃO ANUAL ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">{t('reports.yearEvolution')}</h2>
            <p className="text-sm text-muted mt-0.5">{formatMessage(t('reports.yearSubtitle'), { pronoun })}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:bg-background transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-main tabular-nums w-12 text-center">{year}</span>
            <button
              onClick={() => year < currentYear && setYear((y) => y + 1)}
              disabled={year >= currentYear}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:bg-background disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Year summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>{t('reports.yearRevenues')}</p>
            <MaskedValue value={yearTotalRev} className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>{t('reports.yearExpenses')}</p>
            <MaskedValue value={yearTotalExp} className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400" />
          </div>
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>{t('reports.yearBalance')}</p>
            <MaskedValue value={yearBalance} className={`mt-1 text-lg font-semibold ${yearBalance >= 0 ? 'text-brand' : 'text-red-600 dark:text-red-400'}`} />
          </div>
        </div>

        {/* Line chart */}
        {!hasYearData ? (
          <div className={`${cls.card} p-12 text-center`}>
            <p className="text-muted text-sm">
              {formatMessage(t('reports.emptyYear'), { year, pronoun })}
            </p>
          </div>
        ) : (
          <ReportsChartsSection
            cardClass={cls.card}
            h2Class={cls.h2}
            hasData={false}
            hasCategoryData={false}
            hasYearData={hasYearData}
            categoryTotals={{}}
            categoryLabels={CATEGORY_LABELS}
            categoryColors={CATEGORY_COLORS}
            doughnutData={doughnutData}
            doughnutOptions={doughnutOptions}
            barData={barData}
            barOptions={barOptions}
            lineData={lineData}
            lineOptions={lineOptions}
            year={year}
            pronoun={pronoun}
          />
        )}
      </section>
    </div>
  )
}
