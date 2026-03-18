'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatCurrency } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import CurrencyInput from '@/components/CurrencyInput'
import EmptyState from '@/components/EmptyState'
import ConfirmDangerModal from '@/components/ConfirmDangerModal'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'
import { Plus, X, Loader2, Vault, Trophy, PiggyBank, ArrowUpCircle } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Goal = Database['public']['Tables']['goals']['Row']

const COLOR_OPTIONS = [
  { value: 'gold', label: 'Ouro', gradient: 'from-amber-600 to-yellow-700' },
  { value: 'emerald', label: 'Esmeralda', gradient: 'from-emerald-600 to-emerald-800' },
  { value: 'sky', label: 'Safira', gradient: 'from-sky-600 to-blue-800' },
  { value: 'rose', label: 'Rubi', gradient: 'from-rose-600 to-rose-800' },
  { value: 'purple', label: 'Ametista', gradient: 'from-purple-600 to-purple-800' },
  { value: 'slate', label: 'Platina', gradient: 'from-gray-500 to-gray-700' },
]

function gradientFor(color: string) {
  return COLOR_OPTIONS.find((c) => c.value === color)?.gradient || 'from-amber-600 to-yellow-700'
}

function progressColor(pct: number) {
  if (pct >= 100) return 'bg-brand'
  if (pct >= 75) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-sky-500'
  return 'bg-border'
}

export default function GoalsPage() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()
  const pronoun = useGreetingPronoun()

  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const [showNewForm, setShowNewForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState(0)
  const [newDeadline, setNewDeadline] = useState('')
  const [newColor, setNewColor] = useState('gold')

  const [fundGoalId, setFundGoalId] = useState<string | null>(null)
  const [fundAmount, setFundAmount] = useState(0)
  const [fundSaving, setFundSaving] = useState(false)
  const [fundError, setFundError] = useState<string | null>(null)

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deletingGoal, setDeletingGoal] = useState(false)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setGoals(data as Goal[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const resetNewForm = () => {
    setNewName('')
    setNewTarget(0)
    setNewDeadline('')
    setNewColor('gold')
    setFormError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!newName.trim()) { setFormError('Informe o nome do cofre.'); return }
    if (newTarget <= 0) { setFormError('Informe um valor-alvo maior que zero.'); return }

    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setSaving(false); return }

    const { error } = await supabase.from('goals').insert({
      user_id: userData.user.id,
      name: newName.trim(),
      target_amount: newTarget,
      deadline: newDeadline || null,
      color: newColor,
    })

    if (error) {
      const msg = isConnectionError(error) ? CONNECTION_ERROR_MSG : error.message
      setFormError(msg)
      toastError(msg)
    } else {
      resetNewForm()
      setShowNewForm(false)
      await fetchGoals()
    }
    setSaving(false)
  }

  const handleFund = async () => {
    if (!fundGoalId) return
    setFundError(null)

    if (fundAmount <= 0) { setFundError('Informe um valor maior que zero.'); return }

    setFundSaving(true)
    const goal = goals.find((g) => g.id === fundGoalId)
    if (!goal) { setFundSaving(false); return }

    const newCurrent = Number(goal.current_amount) + fundAmount

    const { error } = await supabase
      .from('goals')
      .update({ current_amount: newCurrent })
      .eq('id', fundGoalId)

    if (error) {
      setFundError(error.message)
    } else {
      setGoals((prev) =>
        prev.map((g) => g.id === fundGoalId ? { ...g, current_amount: newCurrent } : g)
      )
      setFundGoalId(null)
      setFundAmount(0)
    }
    setFundSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    setDeletingGoal(true)
    try {
      const { error } = await supabase.from('goals').delete().eq('id', deleteTargetId)
      if (error) throw error
      setGoals((prev) => prev.filter((g) => g.id !== deleteTargetId))
    } catch (err: unknown) {
      toastError(isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao excluir.'))
    } finally {
      setDeletingGoal(false)
      setDeleteTargetId(null)
    }
  }

  const cls = {
    card: 'rounded-xl border border-border bg-surface transition-colors',
    h1: 'text-xl font-semibold text-main',
    sub: 'text-sm text-muted',
    label: 'block text-xs font-medium text-muted uppercase tracking-wider mb-1.5',
    input: 'block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors',
    btnPrimary: 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50 transition-colors',
    skel: 'bg-border rounded animate-pulse',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className={`h-6 w-64 ${cls.skel}`} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${cls.card} p-6 space-y-4 animate-pulse`}>
              <div className={`h-4 w-32 ${cls.skel}`} />
              <div className={`h-8 w-40 ${cls.skel}`} />
              <div className={`h-3 w-full ${cls.skel}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cls.h1}>Cofres e Patrimônio</h1>
          <p className={`${cls.sub} mt-0.5`}>Seus objetivos de longo prazo, {pronoun}</p>
        </div>
        <button onClick={() => { setShowNewForm(true); resetNewForm() }} className={cls.btnPrimary}>
          <Plus className="h-4 w-4" /> Novo cofre
        </button>
      </div>

      {/* Modal: Novo cofre */}
      {showNewForm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
          <div className={`${cls.card} w-full max-w-lg p-6 space-y-5 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-main">Abrir novo cofre</h2>
              <button onClick={() => setShowNewForm(false)} className="text-muted hover:text-main transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={cls.label}>Nome do objetivo</label>
                <input className={cls.input} placeholder="Ex.: Reserva de emergência" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>Valor-alvo (R$)</label>
                  <CurrencyInput value={newTarget} onChange={setNewTarget} placeholder="10.000,00" className={cls.input} required />
                </div>
                <div>
                  <label className={cls.label}>Prazo (opcional)</label>
                  <input type="date" className={cls.input} value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={cls.label}>Cor do cofre</label>
                <div className="flex gap-2 mt-1">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      onClick={() => setNewColor(opt.value)}
                      className={`h-8 w-8 rounded-full bg-gradient-to-br ${opt.gradient} ring-2 ring-offset-2 ring-offset-surface transition-all ${
                        newColor === opt.value ? 'ring-brand scale-110' : 'ring-transparent hover:ring-border'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewForm(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className={cls.btnPrimary}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : 'Criar cofre'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Aportar */}
      {fundGoalId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
          <div className={`${cls.card} w-full max-w-sm p-6 space-y-5 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-main">Adicionar fundo</h2>
              <button onClick={() => { setFundGoalId(null); setFundAmount(0); setFundError(null) }} className="text-muted hover:text-main transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted">
              Quanto deseja alocar neste cofre hoje, {pronoun}?
            </p>
            {fundError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {fundError}
              </div>
            )}
            <div>
              <label className={cls.label}>Valor (R$)</label>
              <CurrencyInput value={fundAmount} onChange={setFundAmount} placeholder="500,00" className={cls.input} autoFocus />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setFundGoalId(null); setFundAmount(0); setFundError(null) }} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background transition-colors">
                Cancelar
              </button>
              <button onClick={handleFund} disabled={fundSaving} className={cls.btnPrimary}>
                {fundSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : <><ArrowUpCircle className="h-4 w-4" /> Aportar</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lista de metas */}
      {goals.length === 0 ? (
        <EmptyState
          icon={Vault}
          title="Nenhum cofre aberto"
          description={`Permita-me ajudá-lo a criar o primeiro objetivo financeiro, ${pronoun}. Cada grande fortuna começa com uma meta.`}
          actionLabel="Abrir primeiro cofre"
          onAction={() => { setShowNewForm(true); resetNewForm() }}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const target = Number(goal.target_amount) || 1
            const current = Number(goal.current_amount) || 0
            const pct = Math.min(Math.round((current / target) * 100), 100)
            const isComplete = pct >= 100
            const gradient = gradientFor(goal.color)

            return (
              <div key={goal.id} className={`${cls.card} overflow-hidden group`}>
                {/* Color header */}
                <div className={`h-2 bg-gradient-to-r ${gradient}`} />

                <div className="p-5 space-y-4">
                  {/* Title + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                        {isComplete
                          ? <Trophy className="h-4 w-4 text-white" />
                          : <PiggyBank className="h-4 w-4 text-white/80" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-main truncate">{goal.name}</p>
                        {goal.deadline && (
                          <p className="text-xs text-muted">
                            Prazo: {new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    {isComplete && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand ring-1 ring-inset ring-brand/30">
                        <Trophy className="h-3 w-3" /> Alcançado
                      </span>
                    )}
                  </div>

                  {/* Values */}
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <MaskedValue value={current} className="text-lg font-bold text-main" />
                      <span className="text-xs text-muted">
                        de <MaskedValue value={target} className="font-medium" />
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2.5 w-full rounded-full bg-border overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted text-right tabular-nums">{pct}%</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {!isComplete && (
                      <button
                        onClick={() => { setFundGoalId(goal.id); setFundAmount(0); setFundError(null) }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-main hover:bg-background transition-colors"
                      >
                        <ArrowUpCircle className="h-3.5 w-3.5" /> Adicionar fundo
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTargetId(goal.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDangerModal
        open={!!deleteTargetId}
        title="Remover Cofre"
        description={`Deseja remover este cofre permanentemente, ${pronoun}? Todo o progresso acumulado será perdido.`}
        loading={deletingGoal}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
