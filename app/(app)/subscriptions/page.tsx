'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { formatCurrency } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import EmptyState from '@/components/EmptyState'
import ConfirmDangerModal from '@/components/ConfirmDangerModal'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'
import {
  Plus, X, Loader2, RefreshCw, Pencil,
  Tv, Music, Cloud, ShoppingBag, Dumbbell, BookOpen, Gamepad2, Wifi, Shield, Sparkles,
} from 'lucide-react'
import type { Database } from '@/types/supabase'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  assinaturas: Tv,
  streaming: Tv,
  musica: Music,
  cloud: Cloud,
  compras: ShoppingBag,
  fitness: Dumbbell,
  educacao: BookOpen,
  jogos: Gamepad2,
  internet: Wifi,
  seguranca: Shield,
}

const CATEGORY_OPTIONS = [
  { value: 'streaming', label: 'Streaming' },
  { value: 'musica', label: 'Música' },
  { value: 'cloud', label: 'Cloud / Software' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'educacao', label: 'Educação' },
  { value: 'jogos', label: 'Jogos' },
  { value: 'internet', label: 'Internet / Telecom' },
  { value: 'seguranca', label: 'Seguro / Proteção' },
  { value: 'compras', label: 'Compras' },
  { value: 'assinaturas', label: 'Outros' },
]

function getIcon(category: string) {
  return CATEGORY_ICONS[category] || Sparkles
}

export default function SubscriptionsPage() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()
  const pronoun = useGreetingPronoun()

  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [fName, setFName] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fCategory, setFCategory] = useState('streaming')
  const [fCycle, setFCycle] = useState<'mensal' | 'anual'>('mensal')
  const [fNextDate, setFNextDate] = useState('')

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deletingSub, setDeletingSub] = useState(false)

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .order('active', { ascending: false })
      .order('next_billing_date', { ascending: true })
    if (data) setSubs(data as Subscription[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  const monthlyTotal = subs
    .filter((s) => s.active)
    .reduce((sum, s) => {
      const amt = Number(s.amount || 0)
      return sum + (s.billing_cycle === 'anual' ? amt / 12 : amt)
    }, 0)

  const resetForm = () => {
    setFName('')
    setFAmount('')
    setFCategory('streaming')
    setFCycle('mensal')
    setFNextDate('')
    setFormError(null)
    setEditId(null)
  }

  const openNew = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (s: Subscription) => {
    setEditId(s.id)
    setFName(s.name)
    setFAmount(String(s.amount))
    setFCategory(s.category || 'assinaturas')
    setFCycle(s.billing_cycle as 'mensal' | 'anual')
    setFNextDate(s.next_billing_date)
    setFormError(null)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const amount = parseFloat(fAmount.replace(/\./g, '').replace(',', '.')) || 0
    if (!fName.trim()) { setFormError('Informe o nome da assinatura.'); return }
    if (amount <= 0) { setFormError('Informe um valor maior que zero.'); return }
    if (!fNextDate) { setFormError('Informe a data da próxima cobrança.'); return }

    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setSaving(false); return }

    if (editId) {
      const { error } = await supabase.from('subscriptions').update({
        name: fName.trim(),
        amount,
        category: fCategory,
        billing_cycle: fCycle,
        next_billing_date: fNextDate,
      }).eq('id', editId)
      if (error) {
        const msg = isConnectionError(error) ? CONNECTION_ERROR_MSG : error.message
        setFormError(msg)
        toastError(msg)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from('subscriptions').insert({
        user_id: userData.user.id,
        name: fName.trim(),
        amount,
        category: fCategory,
        billing_cycle: fCycle,
        next_billing_date: fNextDate,
      })
      if (error) {
        const msg = isConnectionError(error) ? CONNECTION_ERROR_MSG : error.message
        setFormError(msg)
        toastError(msg)
        setSaving(false)
        return
      }
    }

    resetForm()
    setShowForm(false)
    await fetchSubs()
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    setTogglingId(id)
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, active: !current } : s))
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ active: !current })
        .eq('id', id)
      if (error) throw error
    } catch (err: unknown) {
      setSubs((prev) => prev.map((s) => s.id === id ? { ...s, active: current } : s))
      toastError(isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao atualizar.'))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    setDeletingSub(true)
    try {
      const { error } = await supabase.from('subscriptions').delete().eq('id', deleteTargetId)
      if (error) throw error
      setSubs((prev) => prev.filter((s) => s.id !== deleteTargetId))
    } catch (err: unknown) {
      toastError(isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao excluir.'))
    } finally {
      setDeletingSub(false)
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
        <div className={`${cls.card} p-4 w-60 animate-pulse`}><div className={`h-4 w-24 ${cls.skel} mb-2`} /><div className={`h-7 w-32 ${cls.skel}`} /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className={`${cls.card} p-5 animate-pulse space-y-3`}><div className={`h-4 w-32 ${cls.skel}`} /><div className={`h-6 w-20 ${cls.skel}`} /></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cls.h1}>Assinaturas e Custos Fixos</h1>
          <p className={`${cls.sub} mt-0.5`}>Os seus compromissos recorrentes, senhor</p>
        </div>
        <button onClick={openNew} className={cls.btnPrimary}>
          <Plus className="h-4 w-4" /> Nova assinatura
        </button>
      </div>

      {/* Resumo mensal */}
      <div className={`${cls.card} p-4 inline-block`}>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Total fixo mensal</p>
        <MaskedValue value={monthlyTotal} className="mt-1 text-2xl font-bold text-main" />
        <p className="text-xs text-muted mt-0.5">{subs.filter((s) => s.active).length} assinatura{subs.filter((s) => s.active).length !== 1 ? 's' : ''} ativa{subs.filter((s) => s.active).length !== 1 ? 's' : ''}</p>
      </div>

      {/* Modal - full screen no mobile */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-black/50 px-0 sm:px-4 py-4 sm:py-0 overflow-y-auto">
          <div className={`${cls.card} w-full max-w-lg p-6 space-y-5 shadow-2xl mt-auto sm:mt-0 max-h-[95vh] sm:max-h-none overflow-y-auto`}>
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-main">
                {editId ? 'Editar assinatura' : 'Nova assinatura'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted hover:text-main hover:bg-background transition-colors touch-manipulation"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{formError}</div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={cls.label}>Nome</label>
                <input className={cls.input} placeholder="Ex.: Netflix, Spotify, AWS..." value={fName} onChange={(e) => setFName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>Valor (R$)</label>
                  <input className={cls.input} placeholder="39,90" value={fAmount} onChange={(e) => setFAmount(e.target.value)} required />
                </div>
                <div>
                  <label className={cls.label}>Ciclo</label>
                  <select className={cls.input} value={fCycle} onChange={(e) => setFCycle(e.target.value as 'mensal' | 'anual')}>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>Categoria</label>
                  <select className={cls.input} value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
                    {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={cls.label}>Próxima cobrança</label>
                  <input type="date" className={cls.input} value={fNextDate} onChange={(e) => setFNextDate(e.target.value)} required />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background transition-colors touch-manipulation">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className={`${cls.btnPrimary} min-h-[44px] w-full sm:w-auto touch-manipulation inline-flex items-center justify-center`}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : editId ? 'Salvar alterações' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Listagem */}
      {subs.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Nenhuma assinatura registrada"
          description={`Permita-me auxiliá-lo a catalogar os seus custos fixos, ${pronoun}. Assim poderei acompanhar as renovações.`}
          actionLabel="Registrar primeira assinatura"
          onAction={openNew}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map((s) => {
            const Icon = getIcon(s.category)
            const isOverdue = new Date(s.next_billing_date + 'T00:00:00') <= new Date()
            return (
              <div key={s.id} className={`${cls.card} p-5 flex flex-col gap-4 ${!s.active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${s.active ? 'bg-brand/15 text-brand' : 'bg-border text-muted'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-main truncate">{s.name}</p>
                      <p className="text-xs text-muted capitalize">{s.billing_cycle}</p>
                    </div>
                  </div>
                  <MaskedValue value={Number(s.amount)} className="text-lg font-bold text-main tabular-nums shrink-0" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted">
                    Próxima:{' '}
                    <span className={isOverdue && s.active ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                      {new Date(s.next_billing_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    {isOverdue && s.active && <span className="ml-1 text-amber-600 dark:text-amber-400">· Vencida</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  {/* Toggle ativo */}
                  <button
                    onClick={() => toggleActive(s.id, s.active)}
                    disabled={togglingId === s.id}
                    className="flex items-center gap-2 text-xs text-muted hover:text-main transition-colors"
                  >
                    <span className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${s.active ? 'bg-brand' : 'bg-border'}`}>
                      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${s.active ? 'translate-x-4' : 'translate-x-0'}`} />
                    </span>
                    {s.active ? 'Ativa' : 'Pausada'}
                  </button>

                  <div className="flex-1" />

                  <button onClick={() => openEdit(s)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-main transition-colors" title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteTargetId(s.id)} className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors" title="Remover">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDangerModal
        open={!!deleteTargetId}
        title="Remover Assinatura"
        description={`Deseja remover esta assinatura permanentemente, ${pronoun}? Ela deixará de ser rastreada pelo sistema.`}
        loading={deletingSub}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
