'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatDate } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import EmptyState from '@/components/EmptyState'
import ConfirmDangerModal from '@/components/ConfirmDangerModal'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'
import type { Database } from '@/types/supabase'
import {
  Plus,
  Paperclip,
  CheckCircle2,
  Circle,
  Pencil,
  Loader2,
  Receipt,
  Search,
  Trash2,
  Check,
  Copy,
  Download,
} from 'lucide-react'
import { downloadCsv, formatDateBR } from '@/lib/exportCsv'
import {
  allIdsInDuplicateClusters,
  allSuggestedDeleteIds,
  clusterDuplicatesByFingerprint,
  expenseDuplicateFingerprint,
} from '@/lib/transactionDuplicates'

type Expense = Database['public']['Tables']['expenses']['Row']

const CATEGORY_LABELS: Record<string, string> = {
  mercado: 'Mercado',
  alimentacao: 'Alimentação',
  compras: 'Compras online',
  transporte: 'Transporte',
  combustivel: 'Combustível',
  veiculo: 'Veículo',
  assinaturas: 'Assinaturas',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  moradia: 'Moradia',
  fatura_cartao: 'Fatura de cartão',
  outros: 'Outros',
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  debito: 'Débito',
  credito: 'Crédito',
  especie: 'Espécie',
  credito_parcelado: 'Parcelado',
}

export default function ExpensesPage() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()
  const pronoun = useGreetingPronoun()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'open'>('all')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)

  const [dangerModal, setDangerModal] = useState<{
    open: boolean
    ids: string[]
    loading: boolean
  }>({ open: false, ids: [], loading: false })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('expenses')
          .select('*')
          .order('due_date', { ascending: false })

        if (fetchError) throw fetchError
        setExpenses((data ?? []) as Expense[])
      } catch (err: any) {
        console.error(err)
        setError(err?.message || 'Erro ao carregar despesas.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  const filtered = useMemo(() => {
    let result = expenses

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((e) => e.description.toLowerCase().includes(q))
    }

    if (filterCategory !== 'all') {
      result = result.filter((e) => e.category === filterCategory)
    }

    if (filterStatus === 'paid') {
      result = result.filter((e) => e.paid)
    } else if (filterStatus === 'open') {
      result = result.filter((e) => !e.paid)
    }

    return result
  }, [expenses, searchQuery, filterCategory, filterStatus])

  const uniqueCategories = useMemo(() => {
    const cats = new Set(expenses.map((e) => e.category))
    return Array.from(cats).sort()
  }, [expenses])

  const duplicateClusters = useMemo(
    () => clusterDuplicatesByFingerprint(expenses, (e) => expenseDuplicateFingerprint(e)),
    [expenses]
  )
  const duplicateHintIds = useMemo(() => allIdsInDuplicateClusters(duplicateClusters), [duplicateClusters])
  const suggestedDuplicateDeleteIds = useMemo(
    () => allSuggestedDeleteIds(duplicateClusters),
    [duplicateClusters]
  )

  const selectSuggestedDuplicates = () => {
    setSelectedIds(new Set(suggestedDuplicateDeleteIds))
  }

  const handleExportCsv = () => {
    const rows = filtered.map((e) => ({
      'Data vencimento': formatDateBR(e.due_date),
      'Descrição': e.description,
      'Categoria': CATEGORY_LABELS[e.category] ?? e.category,
      'Valor (R$)': Number(e.amount || 0).toFixed(2).replace('.', ','),
      'Pagamento': PAYMENT_LABELS[e.payment_method] ?? e.payment_method,
      'Status': e.paid ? 'Pago' : 'Em aberto',
      'Parcela': e.installment_number && e.installments ? `${e.installment_number}/${e.installments}` : '',
      'Origem': e.source === 'import' ? 'Importado' : 'Manual',
    }))
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(rows, `despesas-${today}.csv`)
  }

  const togglePaid = useCallback(async (id: string, currentPaid: boolean) => {
    const newPaid = !currentPaid
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, paid: newPaid } : e)))
    setTogglingIds((prev) => new Set(prev).add(id))

    try {
      const { error: updateErr } = await supabase
        .from('expenses')
        .update({ paid: newPaid })
        .eq('id', id)

      if (updateErr) {
        setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, paid: currentPaid } : e)))
        const msg = isConnectionError(updateErr) ? CONNECTION_ERROR_MSG : 'Falha ao atualizar status. Tente novamente.'
        setError(msg)
        toastError(msg)
      }
    } catch (err: unknown) {
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, paid: currentPaid } : e)))
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : 'Falha ao atualizar status. Tente novamente.'
      setError(msg)
      toastError(msg)
    } finally {
      setTogglingIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }, [supabase])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)))
    }
  }

  const batchMarkPaid = async () => {
    if (selectedIds.size === 0) return
    setBatchLoading(true)
    setError(null)

    const ids = Array.from(selectedIds)
    setExpenses((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, paid: true } : e))

    try {
      const { error: err } = await supabase
        .from('expenses')
        .update({ paid: true })
        .in('id', ids)

      if (err) {
        setExpenses((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, paid: false } : e))
        const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : 'Falha ao atualizar em massa.'
        setError(msg)
        toastError(msg)
      } else {
        setSelectedIds(new Set())
      }
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : 'Falha ao atualizar em massa.'
      setError(msg)
      toastError(msg)
    } finally {
      setBatchLoading(false)
    }
  }

  const openBatchDelete = () => {
    if (selectedIds.size === 0) return
    setDangerModal({ open: true, ids: Array.from(selectedIds), loading: false })
  }

  const confirmBatchDelete = async () => {
    const ids = [...dangerModal.ids]
    setDangerModal((prev) => ({ ...prev, loading: true }))
    setError(null)

    try {
      const { error: err } = await supabase
        .from('expenses')
        .delete()
        .in('id', ids)

      if (err) {
        const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : err.message
        setError(msg)
        toastError(msg)
      } else {
        setExpenses((prev) => prev.filter((e) => !ids.includes(e.id)))
        setSelectedIds(new Set())
      }
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : 'Falha ao excluir registros.'
      setError(msg)
      toastError(msg)
    } finally {
      setDangerModal({ open: false, ids: [], loading: false })
    }
  }

  const totalPaid = expenses.filter((e) => e.paid).reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalOpen = expenses.filter((e) => !e.paid).reduce((s, e) => s + Number(e.amount || 0), 0)
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length
  const someSelected = selectedIds.size > 0

  const cls = {
    input: 'block w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-main">Registro de Saídas</h1>
          <p className="text-sm text-muted mt-0.5">Controle detalhado das suas obrigações financeiras, senhor</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            title="Exportar lista atual em CSV"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-main hover:bg-background disabled:opacity-40 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <Link
            href="/expenses/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Registrar nova saída
          </Link>
        </div>
      </div>

      {/* Mini cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4 transition-colors glass-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Total quitado</p>
          <MaskedValue value={totalPaid} className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400 block" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 transition-colors glass-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Pendências em aberto</p>
          <MaskedValue value={totalOpen} className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400 block" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-border bg-red-100 dark:bg-red-500/15 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && duplicateClusters.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Possíveis duplicatas detectadas
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1">
                {duplicateClusters.length}{' '}
                {duplicateClusters.length === 1 ? 'grupo' : 'grupos'} com o mesmo vencimento (ou data de criação),
                valor, categoria e descrição. Parcelas diferentes não são agrupadas. Sugestão: manter o registro{' '}
                <strong className="text-main">mais antigo</strong> de cada grupo.
              </p>
            </div>
            <button
              type="button"
              onClick={selectSuggestedDuplicates}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 dark:border-amber-500/50 bg-surface px-3 py-2 text-xs font-medium text-main hover:bg-amber-100/80 dark:hover:bg-amber-500/20 transition-colors touch-manipulation min-h-[44px]"
            >
              <Copy className="h-3.5 w-3.5" />
              Selecionar sugeridos ({suggestedDuplicateDeleteIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      {!loading && expenses.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${cls.input} pl-9`}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`${cls.input} sm:w-44`}
          >
            <option value="all">Todas categorias</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className={`${cls.input} sm:w-36`}
          >
            <option value="all">Todos status</option>
            <option value="paid">Quitados</option>
            <option value="open">Em aberto</option>
          </select>
        </div>
      )}

      {/* Batch actions bar */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/15 px-4 py-3">
          <span className="text-sm font-medium text-brand">
            {selectedIds.size} {selectedIds.size === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
          <div className="flex-1" />
          <button
            onClick={batchMarkPaid}
            disabled={batchLoading}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors touch-manipulation"
          >
            {batchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Marcar como pagos
          </button>
          <button
            onClick={openBatchDelete}
            disabled={batchLoading}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors touch-manipulation"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir selecionados
          </button>
        </div>
      )}

      {/* Mobile: Lista de Cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4 animate-pulse glass-card">
              <div className="h-4 w-3/4 rounded bg-border mb-2" />
              <div className="h-5 w-1/3 rounded bg-border" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={`Tudo em ordem, ${pronoun}`}
              description="Não há saídas registradas para este período. Quando houver uma obrigação, estarei pronto para catalogá-la."
              actionLabel="Registrar primeira saída"
              onAction={() => window.location.href = '/expenses/new'}
            />
          ) : (
            <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-muted glass-card">
              Nenhum resultado para os filtros aplicados, {pronoun}.
            </div>
          )
        ) : (
          filtered.map((e) => {
            const isToggling = togglingIds.has(e.id)
            const isSelected = selectedIds.has(e.id)
            const isDup = duplicateHintIds.has(e.id)
            return (
              <div
                key={e.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-brand/50 bg-brand/5'
                    : isDup
                      ? 'border-amber-300/80 dark:border-amber-500/35 bg-amber-50/40 dark:bg-amber-500/5'
                      : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSelect(e.id)}
                    className="mt-0.5 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border -m-2 p-2 touch-manipulation"
                    aria-label={isSelected ? 'Desmarcar' : 'Selecionar'}
                  >
                    <span className={`inline-flex h-5 w-5 rounded border-2 items-center justify-center ${
                      isSelected ? 'bg-brand border-brand' : 'border-border'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-main flex flex-wrap items-center gap-2">
                      {e.description}
                      {isDup && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200">
                          Duplicata?
                        </span>
                      )}
                      {e.source === 'import' && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">
                          Importado
                        </span>
                      )}
                    </p>
                    {e.installments && e.installment_number && (
                      <p className="text-xs text-muted">Parcela {e.installment_number}/{e.installments}</p>
                    )}
                    <p className="text-xs text-muted mt-0.5">{CATEGORY_LABELS[e.category] ?? e.category} · {formatDate(e.due_date)}</p>
                  </div>
                  <MaskedValue value={Number(e.amount || 0)} className="text-base font-semibold tabular-nums shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => togglePaid(e.id, e.paid)}
                    className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                      e.paid ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400'
                    } disabled:opacity-50 flex-1`}
                  >
                    {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : e.paid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    {e.paid ? 'Quitado' : 'Em aberto'}
                  </button>
                  {e.invoice_url && (
                    <a
                      href={e.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-muted hover:bg-background"
                      aria-label="Ver fatura"
                    >
                      <Paperclip className="h-4 w-4" />
                    </a>
                  )}
                  <Link
                    href={`/expenses/${e.id}`}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-muted hover:bg-background"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Desktop: Tabela */}
      <div className="hidden lg:block rounded-xl border border-border bg-surface overflow-hidden transition-colors glass-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-border">
              <tr>
                <th className="px-4 py-3 text-center w-10">
                  {!loading && filtered.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand bg-background cursor-pointer"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">Descrição</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-muted hidden sm:table-cell">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-muted hidden lg:table-cell">Pagamento</th>
                <th className="px-4 py-3 text-left font-medium text-muted hidden lg:table-cell">Vencimento</th>
                <th className="px-4 py-3 text-center font-medium text-muted">Status</th>
                <th className="px-4 py-3 text-center font-medium text-muted">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="mx-auto h-4 w-4 animate-pulse rounded bg-border" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-36 animate-pulse rounded bg-border" /></td>
                    <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-20 animate-pulse rounded bg-border" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-20 animate-pulse rounded bg-border" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-16 animate-pulse rounded bg-border" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-24 animate-pulse rounded bg-border" /></td>
                    <td className="px-4 py-3 text-center"><div className="mx-auto h-5 w-16 animate-pulse rounded-full bg-border" /></td>
                    <td className="px-4 py-3 text-center"><div className="mx-auto h-4 w-16 animate-pulse rounded bg-border" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    {expenses.length === 0 ? (
                      <EmptyState
                        icon={Receipt}
                        title={`Tudo em ordem, ${pronoun}`}
                        description="Não há saídas registradas para este período. Quando houver uma obrigação, estarei pronto para catalogá-la."
                        actionLabel="Registrar primeira saída"
                        onAction={() => window.location.href = '/expenses/new'}
                      />
                    ) : (
                      <div className="px-4 py-12 text-center text-sm text-muted">
                        Nenhum resultado para os filtros aplicados, {pronoun}.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const isToggling = togglingIds.has(e.id)
                  const isSelected = selectedIds.has(e.id)
                  const isDup = duplicateHintIds.has(e.id)

                  return (
                    <tr
                      key={e.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-brand/5' : isDup ? 'bg-amber-50/50 dark:bg-amber-500/10' : 'hover:bg-background'
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(e.id)}
                          className="h-4 w-4 rounded border-border text-brand focus:ring-brand bg-background cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-main inline-flex flex-wrap items-center gap-2">
                          {e.description}
                          {isDup && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200">
                              Duplicata?
                            </span>
                          )}
                          {e.source === 'import' && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">
                              Importado
                            </span>
                          )}
                        </p>
                        {e.installments && e.installment_number && (
                          <p className="text-xs text-muted">
                            Parcela {e.installment_number}/{e.installments}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        <MaskedValue value={Number(e.amount || 0)} className="text-main" />
                      </td>
                      <td className="px-4 py-3 text-muted hidden sm:table-cell">
                        {CATEGORY_LABELS[e.category] ?? e.category}
                      </td>
                      <td className="px-4 py-3 text-muted hidden lg:table-cell">
                        {PAYMENT_LABELS[e.payment_method] ?? e.payment_method}
                      </td>
                      <td className="px-4 py-3 text-muted hidden lg:table-cell">
                        {formatDate(e.due_date)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => togglePaid(e.id, e.paid)}
                          className={`group inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] rounded-full px-3 py-2 text-xs font-medium transition-colors cursor-pointer select-none ${
                            e.paid
                              ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-500/30 hover:bg-background'
                              : 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-200 dark:ring-red-500/30 hover:bg-background'
                          } disabled:opacity-50`}
                          title={e.paid ? 'Clique para marcar como em aberto' : 'Clique para marcar como quitado'}
                        >
                          {isToggling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : e.paid ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                          {e.paid ? 'Quitado' : 'Em aberto'}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {e.invoice_url ? (
                            <a
                              href={e.invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-brand hover:bg-background transition-colors"
                              title="Ver fatura"
                              aria-label="Ver fatura"
                            >
                              <Paperclip className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-muted" title="Sem anexo" aria-hidden>
                              <Paperclip className="h-4 w-4" />
                            </span>
                          )}
                          <Link
                            href={`/expenses/${e.id}`}
                            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
                            title="Editar registro"
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger modal for batch delete */}
      <ConfirmDangerModal
        open={dangerModal.open}
        title="Atenção, Senhor."
        description={`Tem certeza que deseja apagar permanentemente ${dangerModal.ids.length} registro${dangerModal.ids.length !== 1 ? 's' : ''}? Esta ação é irreversível e afetará os relatórios.`}
        loading={dangerModal.loading}
        onConfirm={confirmBatchDelete}
        onCancel={() => setDangerModal({ open: false, ids: [], loading: false })}
      />
    </div>
  )
}
