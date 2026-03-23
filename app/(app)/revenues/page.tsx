'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatDate } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import type { Database } from '@/types/supabase'
import EmptyState from '@/components/EmptyState'
import ConfirmDangerModal from '@/components/ConfirmDangerModal'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'
import {
  allIdsInDuplicateClusters,
  allSuggestedDeleteIds,
  clusterDuplicatesByFingerprint,
  revenueDuplicateFingerprint,
} from '@/lib/transactionDuplicates'
import {
  Plus,
  CheckCircle2,
  Circle,
  Pencil,
  Loader2,
  Wallet,
  Check,
  Trash2,
  Copy,
  Download,
} from 'lucide-react'
import { downloadCsv, formatDateBR } from '@/lib/exportCsv'

type Revenue = Database['public']['Tables']['revenues']['Row']

export default function RevenuesPage() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()
  const pronoun = useGreetingPronoun()
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dangerModal, setDangerModal] = useState<{
    open: boolean
    ids: string[]
    loading: boolean
  }>({ open: false, ids: [], loading: false })

  const duplicateClusters = useMemo(
    () => clusterDuplicatesByFingerprint(revenues, (r) => revenueDuplicateFingerprint(r)),
    [revenues]
  )
  const duplicateHintIds = useMemo(() => allIdsInDuplicateClusters(duplicateClusters), [duplicateClusters])
  const suggestedDeleteIds = useMemo(() => allSuggestedDeleteIds(duplicateClusters), [duplicateClusters])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('revenues')
          .select('*')
          .order('date', { ascending: false })

        if (fetchError) throw fetchError
        setRevenues((data ?? []) as Revenue[])
      } catch (err: any) {
        console.error(err)
        setError(err?.message || 'Erro ao carregar receitas.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  const toggleReceived = useCallback(async (id: string, currentReceived: boolean) => {
    const newReceived = !currentReceived

    setRevenues((prev) =>
      prev.map((r) => (r.id === id ? { ...r, received: newReceived } : r))
    )
    setTogglingIds((prev) => new Set(prev).add(id))

    try {
      const { error: updateErr } = await supabase
        .from('revenues')
        .update({ received: newReceived })
        .eq('id', id)

      if (updateErr) {
        setRevenues((prev) =>
          prev.map((r) => (r.id === id ? { ...r, received: currentReceived } : r))
        )
        const msg = isConnectionError(updateErr) ? CONNECTION_ERROR_MSG : 'Falha ao atualizar status. Tente novamente.'
        setError(msg)
        toastError(msg)
      }
    } catch (err: unknown) {
      setRevenues((prev) =>
        prev.map((r) => (r.id === id ? { ...r, received: currentReceived } : r))
      )
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : 'Falha ao atualizar status. Tente novamente.'
      setError(msg)
      toastError(msg)
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
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
    if (selectedIds.size === revenues.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(revenues.map((r) => r.id)))
    }
  }

  const selectSuggestedDuplicates = () => {
    setSelectedIds(new Set(suggestedDeleteIds))
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
        .from('revenues')
        .delete()
        .in('id', ids)

      if (err) {
        const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : err.message
        setError(msg)
        toastError(msg)
      } else {
        setRevenues((prev) => prev.filter((r) => !ids.includes(r.id)))
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

  const totalReceived = revenues
    .filter((r) => r.received)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const totalPending = revenues
    .filter((r) => !r.received)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)

  const allSelected = revenues.length > 0 && selectedIds.size === revenues.length
  const someSelected = selectedIds.size > 0

  const handleExportCsv = () => {
    const rows = revenues.map((r) => ({
      'Data': formatDateBR(r.date),
      'Data prevista': formatDateBR(r.expected_date),
      'Descrição': r.description,
      'Valor (R$)': Number(r.amount || 0).toFixed(2).replace('.', ','),
      'Status': r.received ? 'Recebido' : 'Pendente',
      'Origem': r.source === 'import' ? 'Importado' : 'Manual',
    }))
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(rows, `receitas-${today}.csv`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-main">Registro de Entradas</h1>
          <p className="text-sm text-muted mt-0.5">Acompanhamento dos seus rendimentos e recebimentos, {pronoun}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={revenues.length === 0}
            title="Exportar lista atual em CSV"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-main hover:bg-background disabled:opacity-40 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <Link
            href="/revenues/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Registrar nova entrada
          </Link>
        </div>
      </div>

      {/* Mini cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4 transition-colors glass-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Total recebido</p>
          <MaskedValue value={totalReceived} className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400 block" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 transition-colors glass-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Pendente de recebimento</p>
          <MaskedValue value={totalPending} className="mt-1 text-lg font-semibold text-amber-600 dark:text-amber-400 block" />
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
                {duplicateClusters.length === 1 ? 'grupo' : 'grupos'} com a mesma data, valor e descrição (após
                normalização). Linhas marcadas em âmbar estão nesses grupos. Sugestão: manter o registro{' '}
                <strong className="text-main">mais antigo</strong> de cada grupo e excluir o restante.
              </p>
            </div>
            <button
              type="button"
              onClick={selectSuggestedDuplicates}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 dark:border-amber-500/50 bg-surface px-3 py-2 text-xs font-medium text-main hover:bg-amber-100/80 dark:hover:bg-amber-500/20 transition-colors touch-manipulation min-h-[44px]"
            >
              <Copy className="h-3.5 w-3.5" />
              Selecionar sugeridos ({suggestedDeleteIds.size})
            </button>
          </div>
        </div>
      )}

      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/30 bg-brand/15 px-4 py-3">
          <span className="text-sm font-medium text-brand">
            {selectedIds.size} {selectedIds.size === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
          <div className="flex-1 min-w-[8rem]" />
          <button
            type="button"
            onClick={openBatchDelete}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors touch-manipulation"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir selecionados
          </button>
        </div>
      )}

      {/* Mobile: Lista de Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4 animate-pulse glass-card">
              <div className="h-4 w-3/4 rounded bg-border mb-2" />
              <div className="h-5 w-1/3 rounded bg-border" />
            </div>
          ))
        ) : revenues.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nenhuma entrada registrada"
            description={`Ainda não há rendimentos catalogados, ${pronoun}. Permita-me registrar o primeiro quando estiver pronto.`}
            actionLabel="Registrar primeira entrada"
            onAction={() => window.location.href = '/revenues/new'}
          />
        ) : (
          revenues.map((r) => {
            const isToggling = togglingIds.has(r.id)
            const isSelected = selectedIds.has(r.id)
            const isDup = duplicateHintIds.has(r.id)
            return (
              <div
                key={r.id}
                className={`rounded-xl border p-4 glass-card ${
                  isSelected ? 'border-brand/50 bg-brand/5' : isDup ? 'border-amber-300/80 dark:border-amber-500/35 bg-amber-50/40 dark:bg-amber-500/5' : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSelect(r.id)}
                    className="mt-0.5 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border -m-2 p-2 touch-manipulation"
                    aria-label={isSelected ? 'Desmarcar' : 'Selecionar'}
                  >
                    <span
                      className={`inline-flex h-5 w-5 rounded border-2 items-center justify-center ${
                        isSelected ? 'bg-brand border-brand' : 'border-border'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </span>
                  </button>
                  <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium text-main flex flex-wrap items-center gap-2">
                        {r.description}
                        {isDup && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200">
                            Duplicata?
                          </span>
                        )}
                        {r.source === 'import' && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">
                            Importado
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{formatDate(r.date)}</p>
                    </div>
                    <MaskedValue value={Number(r.amount || 0)} className="text-base font-semibold tabular-nums shrink-0" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => toggleReceived(r.id, r.received)}
                    className={`min-h-[44px] flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                      r.received ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    } disabled:opacity-50`}
                  >
                    {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : r.received ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    {r.received ? 'Recebido' : 'Pendente'}
                  </button>
                  <Link
                    href={`/revenues/${r.id}`}
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
      <div className="hidden md:block rounded-xl border border-border bg-surface overflow-hidden transition-colors glass-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-border">
              <tr>
                <th className="px-4 py-3 text-center w-10">
                  {!loading && revenues.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand bg-background cursor-pointer"
                      aria-label="Selecionar todos"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">Descrição</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-muted hidden sm:table-cell">Data efetiva</th>
                <th className="px-4 py-3 text-left font-medium text-muted hidden md:table-cell">Data esperada</th>
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
                    <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-24 animate-pulse rounded bg-border" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-24 animate-pulse rounded bg-border" /></td>
                    <td className="px-4 py-3 text-center"><div className="mx-auto h-5 w-20 animate-pulse rounded-full bg-border" /></td>
                    <td className="px-4 py-3 text-center"><div className="mx-auto h-4 w-8 animate-pulse rounded bg-border" /></td>
                  </tr>
                ))
              ) : revenues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      icon={Wallet}
                      title="Nenhuma entrada registrada"
                      description={`Ainda não há rendimentos catalogados, ${pronoun}. Permita-me registrar o primeiro quando estiver pronto.`}
                      actionLabel="Registrar primeira entrada"
                      onAction={() => window.location.href = '/revenues/new'}
                    />
                  </td>
                </tr>
              ) : (
                revenues.map((r) => {
                  const isToggling = togglingIds.has(r.id)
                  const isSelected = selectedIds.has(r.id)
                  const isDup = duplicateHintIds.has(r.id)

                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-brand/5' : isDup ? 'bg-amber-50/50 dark:bg-amber-500/10' : 'hover:bg-background'
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(r.id)}
                          className="h-4 w-4 rounded border-border text-brand focus:ring-brand bg-background cursor-pointer"
                          aria-label="Selecionar linha"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-main">
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {r.description}
                          {isDup && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200">
                              Duplicata?
                            </span>
                          )}
                          {r.source === 'import' && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">
                              Importado
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        <MaskedValue value={Number(r.amount || 0)} className="text-main" />
                      </td>
                      <td className="px-4 py-3 text-muted hidden sm:table-cell">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 text-muted hidden md:table-cell">{formatDate(r.expected_date)}</td>

                      {/* Status toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => toggleReceived(r.id, r.received)}
                          className={`group inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full px-3 py-2 text-xs font-medium transition-colors duration-200 cursor-pointer select-none ${
                            r.received
                              ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-500/30 hover:bg-emerald-200 dark:hover:bg-emerald-500/20'
                              : 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-200 dark:ring-amber-500/30 hover:bg-amber-200 dark:hover:bg-amber-500/20'
                          } disabled:opacity-50`}
                          title={r.received ? 'Clique para marcar como pendente' : 'Clique para marcar como recebido'}
                        >
                          {isToggling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : r.received ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                          {r.received ? 'Recebido' : 'Pendente'}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/revenues/${r.id}`}
                          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
                          title="Editar registro"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDangerModal
        open={dangerModal.open}
        title="Excluir receitas"
        description={`Tem certeza que deseja apagar permanentemente ${dangerModal.ids.length} registro${dangerModal.ids.length !== 1 ? 's' : ''} de receita? Esta ação é irreversível.`}
        loading={dangerModal.loading}
        onConfirm={confirmBatchDelete}
        onCancel={() => setDangerModal({ open: false, ids: [], loading: false })}
      />
    </div>
  )
}
