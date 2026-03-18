'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { maskCurrency } from '@/lib/format'
import MaskedValue from '@/components/MaskedValue'
import EmptyState from '@/components/EmptyState'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import {
  Plus, X, Loader2, Pencil, Wallet, Calendar, Repeat,
} from 'lucide-react'
import type { Database } from '@/types/supabase'

type IncomeSource = Database['public']['Tables']['income_sources']['Row']

const FREQUENCY_LABELS: Record<string, string> = {
  mensal: 'Mensal',
  quinzenal: 'Quinzenal',
  semanal: 'Semanal',
}

export default function IncomeSourcesPage() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()

  const [sources, setSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [fName, setFName] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fFrequency, setFFrequency] = useState<'mensal' | 'quinzenal' | 'semanal'>('mensal')
  const [fNextDate, setFNextDate] = useState('')

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchSources = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('income_sources')
      .select('*')
      .order('active', { ascending: false })
      .order('next_receipt_date', { ascending: true })
    if (data) setSources(data as IncomeSource[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchSources() }, [fetchSources])

  const resetForm = () => {
    setFName('')
    setFAmount('')
    setFFrequency('mensal')
    setFNextDate('')
    setFormError(null)
    setEditId(null)
  }

  const openNew = () => {
    resetForm()
    const today = new Date().toISOString().slice(0, 10)
    setFNextDate(today)
    setShowForm(true)
  }

  const openEdit = (s: IncomeSource) => {
    setEditId(s.id)
    setFName(s.name)
    setFAmount(Number(s.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    setFFrequency(s.frequency as 'mensal' | 'quinzenal' | 'semanal')
    setFNextDate(s.next_receipt_date)
    setFormError(null)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const amount = parseFloat(fAmount.replace(/\./g, '').replace(',', '.').replace(/\s/g, '')) || 0
    if (!fName.trim()) { setFormError('Informe o nome da fonte de renda.'); return }
    if (amount <= 0) { setFormError('Informe um valor maior que zero.'); return }
    if (!fNextDate) { setFormError('Informe a data do próximo recebimento.'); return }

    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setSaving(false); return }

    if (editId) {
      const { error } = await supabase.from('income_sources').update({
        name: fName.trim(),
        amount,
        frequency: fFrequency,
        next_receipt_date: fNextDate,
      }).eq('id', editId)
      if (error) {
        const msg = isConnectionError(error) ? CONNECTION_ERROR_MSG : error.message
        setFormError(msg)
        toastError(msg)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from('income_sources').insert({
        user_id: userData.user.id,
        name: fName.trim(),
        amount,
        frequency: fFrequency,
        next_receipt_date: fNextDate,
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
    await fetchSources()
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    setTogglingId(id)
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, active: !current } : s))
    try {
      const { error } = await supabase
        .from('income_sources')
        .update({ active: !current })
        .eq('id', id)
      if (error) throw error
    } catch (err: unknown) {
      setSources((prev) => prev.map((s) => s.id === id ? { ...s, active: current } : s))
      toastError(isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao atualizar.'))
    } finally {
      setTogglingId(null)
    }
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
          <h1 className={cls.h1}>Fontes de Renda</h1>
          <p className={`${cls.sub} mt-0.5`}>As origens do seu patrimônio, patrão.</p>
        </div>
        <button onClick={openNew} className={cls.btnPrimary}>
          <Plus className="h-4 w-4" /> Nova fonte
        </button>
      </div>

      {/* Modal - full screen no mobile */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-black/50 px-0 sm:px-4 py-4 sm:py-0 overflow-y-auto animate-backdrop-enter">
          <div className={`${cls.card} w-full max-w-lg p-6 space-y-5 shadow-2xl animate-modal-enter mt-auto sm:mt-0 max-h-[95vh] sm:max-h-none overflow-y-auto`}>
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editId ? 'Ajustar contrato' : 'Nova fonte de renda'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-400 dark:text-manor-500 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors touch-manipulation"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editId && (
              <p className="text-xs text-gray-500 dark:text-manor-400 bg-gray-50 dark:bg-manor-800/50 rounded-lg px-3 py-2">
                Este novo valor será aplicado apenas aos próximos recebimentos, mantendo seu histórico financeiro passado intacto.
              </p>
            )}

            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{formError}</div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={cls.label}>Nome</label>
                <input className={cls.input} placeholder="Ex.: Pró-labore Empresa X, Salário..." value={fName} onChange={(e) => setFName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>Valor (R$)</label>
                  <input className={cls.input} placeholder="5.000,00" value={fAmount} onChange={(e) => setFAmount(maskCurrency(e.target.value))} required />
                </div>
                <div>
                  <label className={cls.label}>Frequência</label>
                  <select className={cls.input} value={fFrequency} onChange={(e) => setFFrequency(e.target.value as any)}>
                    <option value="mensal">Mensal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={cls.label}>Próximo recebimento</label>
                <input type="date" className={cls.input} value={fNextDate} onChange={(e) => setFNextDate(e.target.value)} required />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors touch-manipulation">
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
      {sources.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma fonte de renda registrada"
          description="Permita-me catalogar as origens do seu patrimônio, patrão. Salários, pró-labore e quinzenas."
          actionLabel="Registrar primeira fonte"
          onAction={openNew}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => (
            <div key={s.id} className={`${cls.card} p-5 flex flex-col gap-4 ${!s.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${s.active ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-manor-800 text-gray-400 dark:text-manor-500'}`}>
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 dark:text-manor-500 flex items-center gap-1">
                      <Repeat className="h-3 w-3" /> {FREQUENCY_LABELS[s.frequency]}
                    </p>
                  </div>
                </div>
                <MaskedValue value={Number(s.amount)} className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0" />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-manor-400">
                <Calendar className="h-3.5 w-3.5" />
                Próximo: {new Date(s.next_receipt_date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-manor-800">
                <button
                  onClick={() => toggleActive(s.id, s.active)}
                  disabled={togglingId === s.id}
                  className="flex items-center gap-2 text-xs text-gray-500 dark:text-manor-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <span className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${s.active ? 'bg-gold-500' : 'bg-gray-200 dark:bg-manor-700'}`}>
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${s.active ? 'translate-x-4' : 'translate-x-0'}`} />
                  </span>
                  {s.active ? 'Ativa' : 'Pausada'}
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => openEdit(s)}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1 rounded-lg text-xs text-gray-400 dark:text-manor-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors touch-manipulation"
                  title="Ajustar contrato"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
