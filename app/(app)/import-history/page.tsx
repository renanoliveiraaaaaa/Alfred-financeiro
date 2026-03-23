'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatDateBR } from '@/lib/exportCsv'
import ConfirmDangerModal from '@/components/ConfirmDangerModal'
import EmptyState from '@/components/EmptyState'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'
import { History, Trash2, CheckCircle2, XCircle, Loader2, FileText, Building2 } from 'lucide-react'

type ImportSession = {
  id: string
  file_name: string
  bank: string
  period_start: string
  period_end: string
  total_transactions: number
  imported_transactions: number
  skipped_transactions: number
  status: string
  created_at: string
}

const BANK_LABELS: Record<string, string> = {
  itau: 'Itaú',
  bradesco: 'Bradesco',
  bb: 'Banco do Brasil',
  caixa: 'Caixa Econômica',
  santander: 'Santander',
  inter: 'Banco Inter',
  c6: 'C6 Bank',
  nubank: 'Nubank',
  generic: 'Banco genérico',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> Concluído
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300">
        <XCircle className="h-3 w-3" /> Falhou
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
      <Loader2 className="h-3 w-3 animate-spin" /> Processando
    </span>
  )
}

export default function ImportHistoryPage() {
  const supabase = createSupabaseClient()
  const { toast, toastError } = useToast()
  const pronoun = useGreetingPronoun()

  const [sessions, setSessions] = useState<ImportSession[]>([])
  const [loading, setLoading] = useState(true)
  const [undoTarget, setUndoTarget] = useState<ImportSession | null>(null)
  const [undoing, setUndoing] = useState(false)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('import_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toastError(isConnectionError(error) ? CONNECTION_ERROR_MSG : error.message)
    } else {
      setSessions((data ?? []) as ImportSession[])
    }
    setLoading(false)
  }, [supabase, toastError])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleUndo = async () => {
    if (!undoTarget) return
    setUndoing(true)
    try {
      const sessionId = undoTarget.id

      const [revDel, expDel] = await Promise.all([
        supabase.from('revenues').delete().eq('import_session_id', sessionId),
        supabase.from('expenses').delete().eq('import_session_id', sessionId),
      ])

      if (revDel.error) throw new Error(revDel.error.message)
      if (expDel.error) throw new Error(expDel.error.message)

      const { error: sessionDel } = await supabase
        .from('import_sessions')
        .delete()
        .eq('id', sessionId)
      if (sessionDel) throw new Error(sessionDel.message)

      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast(`Importação desfeita com sucesso, ${pronoun}.`, 'success')
    } catch (err: unknown) {
      toastError(isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao desfazer importação.'))
    } finally {
      setUndoing(false)
      setUndoTarget(null)
    }
  }

  const totalImported = sessions.reduce((sum, s) => sum + (s.imported_transactions || 0), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-64 bg-border rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-main">Histórico de Importações</h1>
          <p className="text-sm text-muted mt-0.5">
            Extratos importados e transações geradas, {pronoun}
          </p>
        </div>
        {sessions.length > 0 && (
          <div className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm shrink-0 glass-card">
            <span className="text-muted">Total importado: </span>
            <span className="font-semibold text-main">{totalImported} transações</span>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nenhuma importação registrada"
          description={`Ainda não há extratos importados, ${pronoun}. Utilize a opção "Importar Extrato" para começar.`}
          actionLabel="Importar extrato"
          onAction={() => { window.location.href = '/import-statement' }}
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-xl border border-border bg-surface p-4 sm:p-5 glass-card"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Info principal */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-main truncate max-w-[260px]" title={session.file_name}>
                        {session.file_name}
                      </p>
                      <StatusBadge status={session.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {BANK_LABELS[session.bank] ?? session.bank}
                      </span>
                      <span>
                        {formatDateBR(session.period_start)} → {formatDateBR(session.period_end)}
                      </span>
                      <span className="text-muted/70">
                        Importado em {formatDateBR(session.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botão desfazer */}
                {session.status === 'completed' && (
                  <button
                    onClick={() => setUndoTarget(session)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Desfazer importação
                  </button>
                )}
              </div>

              {/* Estatísticas */}
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted">Total</p>
                  <p className="text-base font-bold text-main tabular-nums">
                    {session.total_transactions ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Importadas</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {session.imported_transactions ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Ignoradas</p>
                  <p className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {session.skipped_transactions ?? '—'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDangerModal
        open={!!undoTarget}
        title="Desfazer importação"
        description={
          undoTarget
            ? `Isso excluirá permanentemente todas as ${undoTarget.imported_transactions} transações importadas do arquivo "${undoTarget.file_name}". A operação não pode ser desfeita, ${pronoun}.`
            : ''
        }
        loading={undoing}
        onConfirm={handleUndo}
        onCancel={() => setUndoTarget(null)}
      />
    </div>
  )
}
