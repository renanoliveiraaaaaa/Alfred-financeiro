'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import MaskedValue from '@/components/MaskedValue'
import EmptyState from '@/components/EmptyState'
import CardBrandIcon, { BRAND_OPTIONS } from '@/components/CardBrandIcon'
import CardChipIcon from '@/components/CardChipIcon'
import { Plus, CreditCard, X, Loader2, Settings2, AlertTriangle } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Card = Database['public']['Tables']['credit_cards']['Row']

const CARD_GRADIENTS: Record<string, string> = {
  slate: 'from-gray-700 via-gray-800 to-gray-900',
  black: 'from-zinc-800 via-neutral-900 to-black',
  gold: 'from-amber-700 via-yellow-800 to-amber-900',
  navy: 'from-blue-800 via-blue-900 to-slate-900',
  sky: 'from-sky-600 via-blue-700 to-blue-800',
  emerald: 'from-emerald-700 via-emerald-800 to-emerald-900',
  teal: 'from-teal-600 via-teal-700 to-teal-900',
  rose: 'from-rose-700 via-rose-800 to-rose-900',
  red: 'from-red-700 via-red-800 to-red-900',
  purple: 'from-purple-700 via-purple-800 to-purple-900',
  indigo: 'from-indigo-700 via-indigo-800 to-indigo-900',
  orange: 'from-orange-600 via-orange-700 to-amber-800',
}

const COLOR_OPTIONS = [
  { value: 'black', label: 'Ônix' },
  { value: 'slate', label: 'Platina' },
  { value: 'gold', label: 'Ouro' },
  { value: 'navy', label: 'Marinho' },
  { value: 'sky', label: 'Safira' },
  { value: 'emerald', label: 'Esmeralda' },
  { value: 'teal', label: 'Jade' },
  { value: 'rose', label: 'Rosé' },
  { value: 'red', label: 'Rubi' },
  { value: 'purple', label: 'Ametista' },
  { value: 'indigo', label: 'Índigo' },
  { value: 'orange', label: 'Bronze' },
]

export default function CreditCardsPage() {
  const supabase = createSupabaseClient()

  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  // Form modal (create + edit)
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [limit, setLimit] = useState('')
  const [closingDay, setClosingDay] = useState('1')
  const [dueDay, setDueDay] = useState('10')
  const [brand, setBrand] = useState('outros')
  const [color, setColor] = useState('slate')

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('credit_cards')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setCards(data as Card[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchCards() }, [fetchCards])

  const resetForm = () => {
    setName('')
    setLimit('')
    setClosingDay('1')
    setDueDay('10')
    setBrand('outros')
    setColor('slate')
    setFormError(null)
    setFormSuccess(null)
    setEditingCard(null)
  }

  const openNew = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (card: Card) => {
    setEditingCard(card)
    setName(card.name)
    setLimit(String(card.credit_limit))
    setClosingDay(String(card.closing_day))
    setDueDay(String(card.due_day))
    setBrand(card.brand || 'outros')
    setColor(card.color || 'slate')
    setFormError(null)
    setFormSuccess(null)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    setFormSuccess(null)

    const creditLimit = parseFloat(limit.replace(/\./g, '').replace(',', '.')) || 0

    if (editingCard) {
      const { error: err } = await supabase
        .from('credit_cards')
        .update({
          name: name.trim(),
          credit_limit: creditLimit,
          closing_day: parseInt(closingDay),
          due_day: parseInt(dueDay),
          brand: brand === 'outros' ? null : brand,
          color,
        })
        .eq('id', editingCard.id)

      if (err) {
        setFormError(err.message)
      } else {
        setFormSuccess('Cartão atualizado com sucesso, senhor.')
        setCards((prev) =>
          prev.map((c) =>
            c.id === editingCard.id
              ? { ...c, name: name.trim(), credit_limit: creditLimit, closing_day: parseInt(closingDay), due_day: parseInt(dueDay), brand: brand === 'outros' ? null : brand, color }
              : c
          )
        )
        setTimeout(() => { setShowForm(false); resetForm() }, 600)
      }
    } else {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { setSaving(false); return }

      const { error: err } = await supabase.from('credit_cards').insert({
        user_id: userData.user.id,
        name: name.trim(),
        credit_limit: creditLimit,
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
        brand: brand === 'outros' ? null : brand,
        color,
      })

      if (err) {
        setFormError(err.message)
      } else {
        resetForm()
        setShowForm(false)
        await fetchCards()
      }
    }
    setSaving(false)
  }

  const openDeleteConfirm = (card: Card) => {
    setDeleteTarget(card)
    setDeleteError(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)

    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      if (error.message.includes('violates foreign key') || error.code === '23503') {
        setDeleteError('Não é possível excluir este cartão, senhor, pois existem despesas vinculadas a ele no histórico.')
      } else {
        setDeleteError(error.message)
      }
    } else {
      setCards((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
      setShowForm(false)
      resetForm()
    }
    setDeleting(false)
  }

  const cls = {
    card: 'rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 transition-colors',
    label: 'block text-xs font-medium text-gray-500 dark:text-manor-400 uppercase tracking-wider mb-1.5',
    input: 'block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors',
    btnPrimary: 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gold-600 dark:bg-gold-500 text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 disabled:opacity-50 transition-colors',
    skel: 'bg-gray-200 dark:bg-manor-800 rounded animate-pulse',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className={`h-6 w-64 ${cls.skel}`} />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[1.586/1] max-h-44 rounded-xl bg-gray-200 dark:bg-manor-800 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">A Carteira</h1>
          <p className="text-sm text-gray-500 dark:text-manor-400 mt-0.5">Seus cartões de crédito sob a custódia do Alfred, senhor</p>
        </div>
        <button onClick={openNew} className={cls.btnPrimary}>
          <Plus className="h-4 w-4" /> Novo cartão
        </button>
      </div>

      {/* ── Modal Criar/Editar ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className={`${cls.card} w-full max-w-lg p-6 space-y-5 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingCard ? 'Ajustar Cartão' : 'Registrar novo cartão'}
                </h2>
                {editingCard && (
                  <p className="text-xs text-gray-400 dark:text-manor-500 mt-0.5">Atualize as informações desta credencial, senhor</p>
                )}
              </div>
              <button onClick={() => { setShowForm(false); resetForm() }} className="text-gray-400 dark:text-manor-500 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{formError}</div>
            )}
            {formSuccess && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{formSuccess}</div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={cls.label}>Nome do cartão</label>
                <input className={cls.input} placeholder="Ex.: Nubank Black" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>Limite (R$)</label>
                  <input className={cls.input} placeholder="10.000,00" value={limit} onChange={(e) => setLimit(e.target.value)} required />
                </div>
                <div>
                  <label className={cls.label}>Bandeira da credencial</label>
                  <select className={cls.input} value={brand} onChange={(e) => setBrand(e.target.value)}>
                    {BRAND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>Dia de fechamento</label>
                  <input type="number" min="1" max="31" className={cls.input} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} required />
                </div>
                <div>
                  <label className={cls.label}>Dia de vencimento</label>
                  <input type="number" min="1" max="31" className={cls.input} value={dueDay} onChange={(e) => setDueDay(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className={cls.label}>Cor do cartão</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      onClick={() => setColor(opt.value)}
                      className={`h-8 w-8 rounded-full bg-gradient-to-br ${CARD_GRADIENTS[opt.value]} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-manor-900 transition-all ${
                        color === opt.value ? 'ring-gold-500 scale-110' : 'ring-transparent hover:ring-gray-300 dark:hover:ring-manor-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <div>
                  {editingCard && (
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(editingCard)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Excluir cartão
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className={cls.btnPrimary}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : editingCard ? 'Salvar alterações' : 'Adicionar cartão'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Exclusão ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className={`${cls.card} w-full max-w-md p-6 space-y-4 shadow-2xl`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Descartar Cartão?</h2>
                <p className="text-xs text-gray-500 dark:text-manor-400">{deleteTarget.name}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-manor-300">
              Tem certeza de que deseja remover este cartão da sua carteira, senhor? Esta ação não pode ser desfeita.
            </p>

            {deleteError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{deleteError}</div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null) }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors"
              >
                Manter
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Removendo...</> : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de Cartões ── */}
      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sua carteira está vazia, patrão"
          description="Deseja registrar sua primeira credencial? Ficarei encarregado de manter tudo em ordem."
          actionLabel="Adicionar cartão"
          onAction={openNew}
        />
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => {
            const gradient = CARD_GRADIENTS[card.color] || CARD_GRADIENTS.slate
            return (
              <div key={card.id} className="group relative">
                <Link href={`/credit-cards/${card.id}`} className="block">
                  <div className={`aspect-[1.586/1] max-h-44 rounded-xl bg-gradient-to-br ${gradient} p-3.5 flex flex-col justify-between text-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] overflow-hidden relative`}>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),transparent_60%)]" />

                    <div className="relative flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <CardChipIcon size={20} className="text-white/50 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tracking-tight truncate">
                            {card.name}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="relative flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-white/50 mb-0.5">Limite</p>
                        <MaskedValue
                          value={Number(card.credit_limit)}
                          className="text-base font-semibold tracking-tight"
                        />
                        <div className="flex gap-3 mt-1.5 text-[10px] text-white/60">
                          <span>Fecha <strong className="text-white/80">{card.closing_day}</strong></span>
                          <span>Vence <strong className="text-white/80">{card.due_day}</strong></span>
                        </div>
                      </div>
                      <CardBrandIcon brand={card.brand} size="sm" className="text-white/90 shrink-0 self-end" />
                    </div>
                  </div>
                </Link>

                <button
                  onClick={(e) => { e.preventDefault(); openEdit(card) }}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
                  title="Ajustar cartão"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
