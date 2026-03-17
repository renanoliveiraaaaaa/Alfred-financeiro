'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatDate } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import type { Database } from '@/types/supabase'
import EmptyState from '@/components/EmptyState'
import {
  Plus,
  CheckCircle2,
  Circle,
  Pencil,
  Loader2,
  Wallet,
} from 'lucide-react'

type Revenue = Database['public']['Tables']['revenues']['Row']

export default function RevenuesPage() {
  const supabase = createSupabaseClient()
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

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
        setError('Falha ao atualizar status. Tente novamente.')
      }
    } catch {
      setRevenues((prev) =>
        prev.map((r) => (r.id === id ? { ...r, received: currentReceived } : r))
      )
      setError('Falha ao atualizar status. Tente novamente.')
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [supabase])

  const totalReceived = revenues
    .filter((r) => r.received)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const totalPending = revenues
    .filter((r) => !r.received)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Registro de Entradas</h1>
          <p className="text-sm text-gray-400 dark:text-manor-400 mt-0.5">Acompanhamento dos seus rendimentos e recebimentos, senhor</p>
        </div>
        <Link
          href="/revenues/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gold-600 dark:bg-gold-500 px-4 py-2.5 text-sm font-medium text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Registrar nova entrada
        </Link>
      </div>

      {/* Mini cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 p-4 transition-colors">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-manor-500">Total recebido</p>
          <MaskedValue value={totalReceived} className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400 block" />
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 p-4 transition-colors">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-manor-500">Pendente de recebimento</p>
          <MaskedValue value={totalPending} className="mt-1 text-lg font-semibold text-amber-600 dark:text-amber-400 block" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-gray-200 dark:border-manor-800 bg-red-100 dark:bg-red-500/15 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-manor-800 text-sm">
            <thead className="bg-gray-200 dark:bg-manor-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-400 dark:text-manor-400">Descrição</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400 dark:text-manor-400">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400 dark:text-manor-400 hidden sm:table-cell">Data efetiva</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400 dark:text-manor-400 hidden md:table-cell">Data esperada</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400 dark:text-manor-400">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400 dark:text-manor-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-manor-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-4 w-36 animate-pulse rounded bg-gray-200 dark:bg-manor-800" /></td>
                    <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-manor-800" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-manor-800" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-manor-800" /></td>
                    <td className="px-4 py-3 text-center"><div className="mx-auto h-5 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-manor-800" /></td>
                    <td className="px-4 py-3 text-center"><div className="mx-auto h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-manor-800" /></td>
                  </tr>
                ))
              ) : revenues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={Wallet}
                      title="Nenhuma entrada registrada"
                      description="Ainda não há rendimentos catalogados, senhor. Permita-me registrar o primeiro quando estiver pronto."
                      actionLabel="Registrar primeira entrada"
                      onAction={() => window.location.href = '/revenues/new'}
                    />
                  </td>
                </tr>
              ) : (
                revenues.map((r) => {
                  const isToggling = togglingIds.has(r.id)

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-manor-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.description}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        <MaskedValue value={Number(r.amount || 0)} className="text-gray-900 dark:text-white" />
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-manor-500 hidden sm:table-cell">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-manor-500 hidden md:table-cell">{formatDate(r.expected_date)}</td>

                      {/* Status toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => toggleReceived(r.id, r.received)}
                          className={`group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200 cursor-pointer select-none ${
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
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 dark:text-manor-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors"
                          title="Editar registro"
                        >
                          <Pencil className="h-3.5 w-3.5" />
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
    </div>
  )
}
