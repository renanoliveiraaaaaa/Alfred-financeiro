'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatCurrency } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import EmptyState from '@/components/EmptyState'
import ConfirmDangerModal from '@/components/ConfirmDangerModal'
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
  if (pct >= 100) return 'bg-gold-500'
  if (pct >= 75) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-sky-500'
  return 'bg-gray-400 dark:bg-manor-400'
}

export default function GoalsPage() {
  const supabase = createSupabaseClient()

  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const [showNewForm, setShowNewForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [newColor, setNewColor] = useState('gold')

  const [fundGoalId, setFundGoalId] = useState<string | null>(null)
  const [fundAmount, setFundAmount] = useState('')
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
    setNewTarget('')
    setNewDeadline('')
    setNewColor('gold')
    setFormError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const target = parseFloat(newTarget.replace(/\./g, '').replace(',', '.')) || 0
    if (!newName.trim()) { setFormError('Informe o nome do cofre.'); return }
    if (target <= 0) { setFormError('Informe um valor-alvo maior que zero.'); return }

    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setSaving(false); return }

    const { error } = await supabase.from('goals').insert({
      user_id: userData.user.id,
      name: newName.trim(),
      target_amount: target,
      deadline: newDeadline || null,
      color: newColor,
    })

    if (error) {
      setFormError(error.message)
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

    const amount = parseFloat(fundAmount.replace(/\./g, '').replace(',', '.')) || 0
    if (amount <= 0) { setFundError('Informe um valor maior que zero.'); return }

    setFundSaving(true)
    const goal = goals.find((g) => g.id === fundGoalId)
    if (!goal) { setFundSaving(false); return }

    const newCurrent = Number(goal.current_amount) + amount

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
      setFundAmount('')
    }
    setFundSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    setDeletingGoal(true)
    await supabase.from('goals').delete().eq('id', deleteTargetId)
    setGoals((prev) => prev.filter((g) => g.id !== deleteTargetId))
    setDeletingGoal(false)
    setDeleteTargetId(null)
  }

  const cls = {
    card: 'rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 transition-colors',
    h1: 'text-xl font-semibold text-gray-900 dark:text-white',
    sub: 'text-sm text-gray-500 dark:text-manor-400',
    label: 'block text-xs font-medium text-gray-500 dark:text-manor-400 uppercase tracking-wider mb-1.5',
    input: 'block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors',
    btnPrimary: 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gold-600 dark:bg-gold-500 text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 disabled:opacity-50 transition-colors',
    skel: 'bg-gray-200 dark:bg-manor-800 rounded animate-pulse',
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
          <p className={`${cls.sub} mt-0.5`}>Seus objetivos de longo prazo, senhor</p>
        </div>
        <button onClick={() => { setShowNewForm(true); resetNewForm() }} className={cls.btnPrimary}>
          <Plus className="h-4 w-4" /> Novo cofre
        </button>
      </div>

      {/* Modal: Novo cofre */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className={`${cls.card} w-full max-w-lg p-6 space-y-5 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Abrir novo cofre</h2>
              <button onClick={() => setShowNewForm(false)} className="text-gray-400 dark:text-manor-500 hover:text-gray-600 dark:hover:text-white transition-colors">
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
                  <input className={cls.input} placeholder="10.000,00" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} required />
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
                      className={`h-8 w-8 rounded-full bg-gradient-to-br ${opt.gradient} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-manor-900 transition-all ${
                        newColor === opt.value ? 'ring-gold-500 scale-110' : 'ring-transparent hover:ring-gray-300 dark:hover:ring-manor-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewForm(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className={cls.btnPrimary}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : 'Criar cofre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aportar */}
      {fundGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className={`${cls.card} w-full max-w-sm p-6 space-y-5 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Adicionar fundo</h2>
              <button onClick={() => { setFundGoalId(null); setFundAmount(''); setFundError(null) }} className="text-gray-400 dark:text-manor-500 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-manor-400">
              Quanto deseja alocar neste cofre hoje, senhor?
            </p>
            {fundError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {fundError}
              </div>
            )}
            <div>
              <label className={cls.label}>Valor (R$)</label>
              <input className={cls.input} placeholder="500,00" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setFundGoalId(null); setFundAmount(''); setFundError(null) }} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors">
                Cancelar
              </button>
              <button onClick={handleFund} disabled={fundSaving} className={cls.btnPrimary}>
                {fundSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : <><ArrowUpCircle className="h-4 w-4" /> Aportar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de metas */}
      {goals.length === 0 ? (
        <EmptyState
          icon={Vault}
          title="Nenhum cofre aberto"
          description="Permita-me ajudá-lo a criar o primeiro objetivo financeiro, senhor. Cada grande fortuna começa com uma meta."
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
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{goal.name}</p>
                        {goal.deadline && (
                          <p className="text-xs text-gray-400 dark:text-manor-500">
                            Prazo: {new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    {isComplete && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gold-100 dark:bg-gold-500/15 px-2 py-0.5 text-xs font-medium text-gold-700 dark:text-gold-400 ring-1 ring-inset ring-gold-200 dark:ring-gold-500/30">
                        <Trophy className="h-3 w-3" /> Alcançado
                      </span>
                    )}
                  </div>

                  {/* Values */}
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <MaskedValue value={current} className="text-lg font-bold text-gray-900 dark:text-white" />
                      <span className="text-xs text-gray-400 dark:text-manor-500">
                        de <MaskedValue value={target} className="font-medium" />
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-manor-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400 dark:text-manor-500 text-right tabular-nums">{pct}%</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {!isComplete && (
                      <button
                        onClick={() => { setFundGoalId(goal.id); setFundAmount(''); setFundError(null) }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-manor-700 px-3 py-2 text-xs font-medium text-gray-700 dark:text-manor-300 hover:bg-gray-50 dark:hover:bg-manor-800 transition-colors"
                      >
                        <ArrowUpCircle className="h-3.5 w-3.5" /> Adicionar fundo
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTargetId(goal.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-manor-700 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
        description="Deseja remover este cofre permanentemente, senhor? Todo o progresso acumulado será perdido."
        loading={deletingGoal}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
