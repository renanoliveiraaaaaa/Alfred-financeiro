'use client'

import { useEffect, useState, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatCurrency } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import type { Database } from '@/types/supabase'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

type Revenue = Database['public']['Tables']['revenues']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const CATEGORY_LABELS: Record<string, string> = {
  mercado: 'Mercado',
  combustivel: 'Combustível',
  manutencao_carro: 'Manutenção carro',
  outros: 'Outros',
}

const CATEGORY_COLORS: Record<string, string> = {
  mercado: '#10b981',
  combustivel: '#f59e0b',
  manutencao_carro: '#3b82f6',
  outros: '#8b5cf6',
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
  const { resolvedTheme } = useTheme()
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
        const now = new Date()
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        const yearStart = `${year}-01-01`
        const yearEnd = `${year}-12-31`

        const [revMonthRes, expMonthRes, revYearRes, expYearRes] = await Promise.all([
          supabase.from('revenues').select('*').gte('date', firstOfMonth).order('date', { ascending: false }),
          supabase.from('expenses').select('*').gte('due_date', firstOfMonth).order('due_date', { ascending: false }),
          supabase.from('revenues').select('*').gte('date', yearStart).lte('date', yearEnd).order('date', { ascending: true }),
          supabase.from('expenses').select('*').gte('due_date', yearStart).lte('due_date', yearEnd).order('due_date', { ascending: true }),
        ])

        if (revMonthRes.error) throw revMonthRes.error
        if (expMonthRes.error) throw expMonthRes.error

        setRevenues((revMonthRes.data ?? []) as Revenue[])
        setExpenses((expMonthRes.data ?? []) as Expense[])
        setYearRevenues((revYearRes.data ?? []) as Revenue[])
        setYearExpenses((expYearRes.data ?? []) as Expense[])
      } catch (err: any) {
        console.error(err)
        setError(err?.message || 'Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase, year])

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
    labels: ['Entradas', 'Saídas'],
    datasets: [{
      label: 'Valor (R$)',
      data: [totalRevenues, totalExpenses],
      backgroundColor: ['#10b981', '#ef4444'],
      borderRadius: 6,
      barPercentage: 0.5,
    }],
  }), [totalRevenues, totalExpenses])

  const lineData = useMemo(() => ({
    labels: MONTH_LABELS,
    datasets: [
      {
        label: 'Entradas',
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
        label: 'Saídas',
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
  }), [yearRevMonths, yearExpMonths, isDark])

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
    card: 'rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 shadow-sm transition-colors',
    label: 'text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-manor-500',
    h2: 'text-sm font-semibold text-gray-900 dark:text-white',
    skel: 'bg-gray-200 dark:bg-manor-800 rounded animate-pulse',
  }

  const exportCSV = () => {
    const BOM = '\uFEFF'
    const headers = 'Tipo;Descrição;Valor;Data;Categoria;Status'
    const rows: string[] = []

    yearRevenues.forEach((r) => {
      rows.push(`Entrada;"${(r.description || '').replace(/"/g, '""')}";${Number(r.amount || 0).toFixed(2).replace('.', ',')};${r.date};-;${r.received ? 'Recebido' : 'Pendente'}`)
    })

    yearExpenses.forEach((e) => {
      rows.push(`Saída;"${(e.description || '').replace(/"/g, '""')}";${Number(e.amount || 0).toFixed(2).replace('.', ',')};${e.due_date || ''};${e.category || '-'};${e.paid ? 'Pago' : 'Aberto'}`)
    })

    const csv = BOM + headers + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${year}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Análise Patrimonial</h1>
          <p className="text-sm text-gray-400 dark:text-manor-500 mt-0.5">Visão mensal e evolução anual do seu patrimônio, senhor</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={yearRevenues.length === 0 && yearExpenses.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 disabled:opacity-30 transition-colors"
          title="Exportar relatório em CSV"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      {/* ── SEÇÃO MENSAL ── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-manor-500">Período corrente</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>Entradas</p>
            <MaskedValue value={totalRevenues} className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>Saídas</p>
            <MaskedValue value={totalExpenses} className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400" />
          </div>
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>Balanço</p>
            <MaskedValue value={totalRevenues - totalExpenses} className={`mt-1 text-lg font-semibold ${totalRevenues - totalExpenses >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
        </div>

        {!hasData ? (
          <div className={`${cls.card} p-12 text-center`}>
            <p className="text-gray-500 dark:text-manor-400 text-sm">
              Nenhuma movimentação registrada neste período, senhor.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className={`${cls.card} p-6`}>
              <h2 className={`${cls.h2} mb-4`}>Saídas por categoria</h2>
              {!hasCategoryData ? (
                <p className="text-sm text-gray-400 dark:text-manor-500 py-12 text-center">Nenhuma saída registrada neste período.</p>
              ) : (
                <div className="relative h-64">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
              )}
              {hasCategoryData && (
                <ul className="mt-4 space-y-2">
                  {Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).map(([cat, total]) => (
                    <li key={cat} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? '#6b7280' }} />
                        <span className="text-gray-500 dark:text-manor-400">{CATEGORY_LABELS[cat] ?? cat}</span>
                      </div>
                      <MaskedValue value={total} className="font-medium text-gray-900 dark:text-white tabular-nums" />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={`${cls.card} p-6`}>
              <h2 className={`${cls.h2} mb-4`}>Entradas vs Saídas</h2>
              <div className="relative h-64">
                <Bar data={barData} options={barOptions} />
              </div>
              <div className="mt-4 flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-gray-500 dark:text-manor-400">Entradas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-gray-500 dark:text-manor-400">Saídas</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── SEÇÃO ANUAL ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-manor-500">Evolução do Patrimônio Anual</h2>
            <p className="text-sm text-gray-500 dark:text-manor-400 mt-0.5">O balanço do seu império este ano, senhor</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums w-12 text-center">{year}</span>
            <button
              onClick={() => year < currentYear && setYear((y) => y + 1)}
              disabled={year >= currentYear}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Year summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>Entradas no ano</p>
            <MaskedValue value={yearTotalRev} className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>Saídas no ano</p>
            <MaskedValue value={yearTotalExp} className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400" />
          </div>
          <div className={`${cls.card} p-4`}>
            <p className={cls.label}>Balanço total</p>
            <MaskedValue value={yearBalance} className={`mt-1 text-lg font-semibold ${yearBalance >= 0 ? 'text-gold-600 dark:text-gold-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
        </div>

        {/* Line chart */}
        {!hasYearData ? (
          <div className={`${cls.card} p-12 text-center`}>
            <p className="text-gray-500 dark:text-manor-400 text-sm">
              Nenhuma movimentação encontrada em {year}, senhor.
            </p>
          </div>
        ) : (
          <div className={`${cls.card} p-6`}>
            <div className="relative h-80">
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
