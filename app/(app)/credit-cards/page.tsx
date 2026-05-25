'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import MaskedValue from '@/components/MaskedValue'
import CurrencyInput from '@/components/CurrencyInput'
import EmptyState from '@/components/EmptyState'
import CardBrandIcon, { BRAND_OPTIONS } from '@/components/CardBrandIcon'
import CardChipIcon from '@/components/CardChipIcon'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'
import {
  Plus, CreditCard, X, Loader2, Settings2, AlertTriangle,
  Receipt, PieChart, ShoppingBag, Car, Utensils, Home,
  RefreshCw, GraduationCap, Heart, Fuel, ShoppingCart, FileUp,
} from 'lucide-react'
import CardStatementImportModal from '@/components/CardStatementImportModal'
import type { Database } from '@/types/supabase'
import { resolveActiveOrganizationIdForClient } from '@/lib/activeOrganizationClient'
import { useActiveOrganizationRevision } from '@/lib/useActiveOrganizationRevision'
import { useI18n } from '@/lib/i18n'
import { formatMessage } from '@/lib/i18nFormat'
import { buildCategoryLabelsMap } from '@/lib/categoryI18n'

type Card = Database['public']['Tables']['credit_cards']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']

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

const COLOR_VALUES = [
  'black', 'slate', 'gold', 'navy', 'sky', 'emerald', 'teal', 'rose', 'red', 'purple', 'indigo', 'orange',
] as const

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  mercado: <ShoppingCart className="h-4 w-4" />,
  alimentacao: <Utensils className="h-4 w-4" />,
  compras: <ShoppingBag className="h-4 w-4" />,
  transporte: <Car className="h-4 w-4" />,
  combustivel: <Fuel className="h-4 w-4" />,
  veiculo: <Car className="h-4 w-4" />,
  assinaturas: <RefreshCw className="h-4 w-4" />,
  saude: <Heart className="h-4 w-4" />,
  educacao: <GraduationCap className="h-4 w-4" />,
  moradia: <Home className="h-4 w-4" />,
  outros: <Receipt className="h-4 w-4" />,
}

function fmtCurrency(v: number, locale: 'pt' | 'en') {
  return v.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function CreditCardsPage() {
  const supabase = createSupabaseClient()
  const orgRevision = useActiveOrganizationRevision()
  const { toast, toastError } = useToast()
  const pronoun = useGreetingPronoun()
  const { t, locale } = useI18n()
  const CATEGORY_LABELS = useMemo(() => buildCategoryLabelsMap(t), [t])

  const [cards, setCards] = useState<Card[]>([])
  const [monthlySpend, setMonthlySpend] = useState<Record<string, number>>({})
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  // Form modal
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [limit, setLimit] = useState(0)
  const [closingDay, setClosingDay] = useState('1')
  const [dueDay, setDueDay] = useState('10')
  const [brand, setBrand] = useState('outros')
  const [color, setColor] = useState('slate')

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Comprometimento futuro: soma de TODAS as parcelas não pagas (todos os meses)
  const [committedByCard, setCommittedByCard] = useState<Record<string, number>>({})

  const fetchCards = useCallback(async () => {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) {
      setCards([])
      setMonthlySpend({})
      setCommittedByCard({})
      setRecentExpenses([])
      setLoading(false)
      return
    }
    const activeOrgId = await resolveActiveOrganizationIdForClient(supabase, uid)
    if (!activeOrgId) {
      setCards([])
      setMonthlySpend({})
      setCommittedByCard({})
      setRecentExpenses([])
      setLoading(false)
      return
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

    const [{ data: cardsData }, { data: currentMonthData }, { data: allUnpaidData }, { data: recentData }] = await Promise.all([
      supabase
        .from('credit_cards')
        .select('*')
        .eq('organization_id', activeOrgId)
        .order('created_at', { ascending: false }),
      // Fatura do mês atual (o que está vencendo este mês)
      supabase
        .from('expenses')
        .select('credit_card_id, amount')
        .eq('organization_id', activeOrgId)
        .not('credit_card_id', 'is', null)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd),
      // Todas as parcelas não pagas (para calcular limite real comprometido)
      supabase
        .from('expenses')
        .select('credit_card_id, amount')
        .eq('organization_id', activeOrgId)
        .not('credit_card_id', 'is', null)
        .eq('paid', false),
      // Últimos 8 lançamentos em qualquer cartão
      supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', activeOrgId)
        .not('credit_card_id', 'is', null)
        .order('due_date', { ascending: false })
        .limit(8),
    ])

    if (cardsData) setCards(cardsData as Card[])

    // Fatura do mês atual por cartão
    const spend: Record<string, number> = {}
    ;(currentMonthData ?? []).forEach((e) => {
      if (e.credit_card_id) {
        spend[e.credit_card_id] = (spend[e.credit_card_id] ?? 0) + Number(e.amount || 0)
      }
    })
    setMonthlySpend(spend)

    // Total comprometido (todas as parcelas não pagas) por cartão
    const committed: Record<string, number> = {}
    ;(allUnpaidData ?? []).forEach((e) => {
      if (e.credit_card_id) {
        committed[e.credit_card_id] = (committed[e.credit_card_id] ?? 0) + Number(e.amount || 0)
      }
    })
    setCommittedByCard(committed)

    setRecentExpenses((recentData ?? []) as Expense[])
    setLoading(false)
  }, [supabase, orgRevision])

  useEffect(() => { fetchCards() }, [fetchCards])

  // Mapa id → nome do cartão para a seção de lançamentos
  const cardNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    cards.forEach((c) => { m[c.id] = c.name })
    return m
  }, [cards])

  const summary = useMemo(() => {
    const totalLimit = cards.reduce((s, c) => s + Number(c.credit_limit || 0), 0)
    // Fatura do mês corrente (o que vence este mês)
    const totalMonthly = cards.reduce((s, c) => s + (monthlySpend[c.id] ?? 0), 0)
    // Total comprometido real = todas as parcelas não pagas
    const totalCommitted = cards.reduce((s, c) => s + (committedByCard[c.id] ?? 0), 0)
    const available = Math.max(0, totalLimit - totalCommitted)
    const pct = totalLimit > 0 ? (totalCommitted / totalLimit) * 100 : 0
    return { totalLimit, totalMonthly, totalCommitted, available, pct }
  }, [cards, monthlySpend, committedByCard])

  const resetForm = () => {
    setName(''); setLimit(0); setClosingDay('1'); setDueDay('10')
    setBrand('outros'); setColor('slate'); setFormError(null); setEditingCard(null)
  }

  const openNew = () => { resetForm(); setShowForm(true) }

  const [showImportModal, setShowImportModal] = useState(false)

  const openEdit = (card: Card) => {
    setEditingCard(card)
    setName(card.name); setLimit(Number(card.credit_limit) || 0)
    setClosingDay(String(card.closing_day)); setDueDay(String(card.due_day))
    setBrand(card.brand || 'outros'); setColor(card.color || 'slate')
    setFormError(null); setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (limit <= 0) { setFormError(t('creditCards.error.limit')); return }
    setSaving(true); setFormError(null)

    const payload = {
      name: name.trim(), credit_limit: limit,
      closing_day: parseInt(closingDay), due_day: parseInt(dueDay),
      brand: brand === 'outros' ? null : brand, color,
    }

    if (editingCard) {
      const { error } = await supabase.from('credit_cards').update(payload).eq('id', editingCard.id)
      if (error) setFormError(isConnectionError(error) ? CONNECTION_ERROR_MSG : error.message)
      else {
        setCards((prev) => prev.map((c) => c.id === editingCard.id ? { ...c, ...payload } : c))
        toast(t('creditCards.success.updated'), 'success')
        setShowForm(false); resetForm()
      }
    } else {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { setSaving(false); return }
      const activeOrgId = await resolveActiveOrganizationIdForClient(supabase, userData.user.id)
      if (!activeOrgId) {
        setFormError('Não foi possível determinar a organização ativa.')
        setSaving(false)
        return
      }
      const { error } = await supabase.from('credit_cards').insert({
        ...payload,
        user_id: userData.user.id,
        organization_id: activeOrgId,
      })
      if (error) setFormError(isConnectionError(error) ? CONNECTION_ERROR_MSG : error.message)
      else { toast(t('creditCards.success.added'), 'success'); setShowForm(false); resetForm(); await fetchCards() }
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    const { error } = await supabase.from('credit_cards').delete().eq('id', deleteTarget.id)
    if (error) {
      const msg = isConnectionError(error) ? CONNECTION_ERROR_MSG
        : (error.code === '23503' ? t('creditCards.error.hasExpenses') : error.message)
      setDeleteError(msg)
    } else {
      setCards((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null); setShowForm(false); resetForm()
      toast(t('creditCards.success.removed'), 'success')
    }
    setDeleting(false)
  }

  const cls = {
    surface: 'rounded-xl border border-border bg-surface glass-card',
    label: 'block text-xs font-medium text-muted uppercase tracking-wider mb-1.5',
    input: 'block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors',
    btnPrimary: 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50 transition-colors',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-64 bg-border rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-border animate-pulse" />)}
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[1.586/1] max-h-52 rounded-xl bg-border animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-main">{t('creditCards.title')}</h1>
          <p className="text-sm text-muted mt-0.5">
            {formatMessage(t('creditCards.subtitle'), { pronoun })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-hover hover:text-main transition-colors"
          >
            <FileUp className="h-4 w-4" /> {t('creditCards.importStatement')}
          </button>
          <button onClick={openNew} className={cls.btnPrimary}>
            <Plus className="h-4 w-4" /> {t('creditCards.new')}
          </button>
        </div>
      </div>

      {/* ── 3 cards de resumo ── */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Fatura deste mês */}
          <div className={`${cls.surface} p-5 flex items-center justify-between`}>
            <div>
              <p className="text-xs text-muted mb-1">{t('creditCards.summary.monthlyBill')}</p>
              <MaskedValue value={summary.totalMonthly} className="text-2xl font-bold text-main" />
              <p className="text-[10px] text-muted mt-0.5">{t('creditCards.summary.dueThisMonth')}</p>
            </div>
            <div className="h-11 w-11 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Limite disponível REAL */}
          <div className={`${cls.surface} p-5 flex items-center justify-between`}>
            <div>
              <p className="text-xs text-muted mb-1">{t('creditCards.summary.availableLimit')}</p>
              <MaskedValue value={summary.available} className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" />
              <p className="text-[10px] text-muted mt-0.5">{t('creditCards.summary.discountFuture')}</p>
            </div>
            <div className="h-11 w-11 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          {/* Comprometimento % (sobre total comprometido) */}
          <div className={`${cls.surface} p-5 flex items-center justify-between`}>
            <div>
              <p className="text-xs text-muted mb-1">{t('creditCards.summary.totalCommitted')}</p>
              <div className="flex items-end gap-1.5">
                <span className={`text-2xl font-bold ${summary.pct > 80 ? 'text-red-600 dark:text-red-400' : summary.pct > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-main'}`}>
                  {summary.pct.toFixed(0)}%
                </span>
                <span className="text-xs text-muted mb-1">{t('creditCards.summary.ofLimit')}</span>
              </div>
              <div className="w-32 h-1.5 bg-border rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${summary.pct > 80 ? 'bg-red-500' : summary.pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(summary.pct, 100)}%` }}
                />
              </div>
            </div>
            <div className="h-11 w-11 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
              <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de cartões ── */}
      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t('creditCards.emptyTitle')}
          description={formatMessage(t('creditCards.emptyDesc'), { pronoun })}
          actionLabel={t('creditCards.emptyAction')}
          onAction={openNew}
        />
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {cards.map((card) => {
              const gradient = CARD_GRADIENTS[card.color] || CARD_GRADIENTS.slate
              const monthlyTotal = monthlySpend[card.id] ?? 0
              const committed = committedByCard[card.id] ?? 0
              const lim = Number(card.credit_limit || 0)
              const available = Math.max(0, lim - committed)
              // Barra de utilização mostra comprometimento total (todas as parcelas)
              const pct = lim > 0 ? Math.min((committed / lim) * 100, 100) : 0
              const barColor = pct > 80 ? 'bg-red-400' : pct > 50 ? 'bg-amber-400' : 'bg-white/70'
              // Alias para referências abaixo
              const spent = monthlyTotal

              return (
                <div key={card.id} className="group relative">
                  <Link href={`/credit-cards/${card.id}`} className="block">
                    <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 flex flex-col justify-between text-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative min-h-[210px]`}>
                      {/* Reflexo decorativo */}
                      <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />

                      {/* Topo: chip + nome */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardChipIcon size={20} className="text-white/50 shrink-0" />
                          <p className="text-sm font-semibold tracking-tight truncate">{card.name}</p>
                        </div>
                        <CardBrandIcon brand={card.brand} size="sm" className="text-white/80 shrink-0" />
                      </div>

                      {/* Centro: FATURA ATUAL (destaque) */}
                      <div className="flex-1 flex flex-col justify-center py-3">
                        <p className="text-xs text-white/60 mb-0.5">{t('creditCards.card.monthlyBill')}</p>
                        <MaskedValue value={spent} className="text-2xl font-bold tracking-tight" />

                        {/* Barra de utilização — baseada em comprometimento total */}
                        <div className="mt-3 space-y-1">
                          <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-white/50">
                            {t('creditCards.card.realLimit')}{' '}
                            <span className="text-white/75 font-medium">{fmtCurrency(available, locale)}</span>
                            {' '}{t('creditCards.card.of')}{' '}
                            <span className="text-white/60">{fmtCurrency(lim, locale)}</span>
                          </p>
                          {committed > monthlyTotal && (
                            <p className="text-[10px] text-amber-300/70">
                              {formatMessage(t('creditCards.card.futureInstallments'), { amount: fmtCurrency(committed - monthlyTotal, locale) })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rodapé: fechamento/vencimento */}
                      <div className="flex items-center justify-between text-[11px] text-white/60 pt-3 border-t border-white/10">
                        <div>
                          <span className="block text-white/40 text-[10px]">{t('creditCards.card.closes')}</span>
                          <span className="font-semibold text-white/80">{formatMessage(t('creditCards.card.closesDay'), { day: card.closing_day })}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-white/40 text-[10px]">{t('creditCards.card.due')}</span>
                          <span className="font-semibold text-white/80">{formatMessage(t('creditCards.card.dueDay'), { day: card.due_day })}</span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={(e) => { e.preventDefault(); openEdit(card) }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
                    title={t('creditCards.editCard')}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* ── Últimos lançamentos ── */}
          {recentExpenses.length > 0 && (
            <div className={cls.surface}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-main">{t('creditCards.recentExpenses')}</h2>
                <Link href="/expenses" className="text-xs text-brand hover:underline font-medium">
                  {t('creditCards.viewAll')}
                </Link>
              </div>
              <ul className="divide-y divide-border">
                {recentExpenses.map((exp) => {
                  const catIcon = CATEGORY_ICONS[exp.category ?? ''] ?? <Receipt className="h-4 w-4" />
                  const catLabel = CATEGORY_LABELS[exp.category ?? ''] ?? exp.category ?? '—'
                  const cardName = exp.credit_card_id ? (cardNameMap[exp.credit_card_id] ?? '—') : '—'

                  return (
                    <li
                      key={exp.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-background/60 transition-colors"
                    >
                      {/* Ícone da categoria */}
                      <div className="h-9 w-9 rounded-full bg-border/60 flex items-center justify-center text-muted shrink-0">
                        {catIcon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/expenses/${exp.id}`} className="group">
                          <p className="text-sm font-medium text-main truncate group-hover:text-brand transition-colors">
                            {exp.description}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted mt-0.5 flex-wrap">
                          <span>{fmtDate(exp.due_date)}</span>
                          <span>·</span>
                          <span>{catLabel}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 bg-border/60 px-1.5 py-0.5 rounded-full">
                            <CreditCard className="h-2.5 w-2.5" />
                            {cardName}
                          </span>
                        </div>
                      </div>

                      {/* Valor + status */}
                      <div className="text-right shrink-0">
                        <MaskedValue
                          value={Number(exp.amount || 0)}
                          className="text-sm font-semibold text-main tabular-nums"
                        />
                        <span className={`block text-[10px] mt-0.5 font-medium ${exp.paid ? 'text-emerald-500' : 'text-red-500'}`}>
                          {exp.paid ? t('creditCards.paid') : t('creditCards.open')}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ── Modal Criar/Editar ── */}
      {showForm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className={`${cls.surface} w-full max-w-lg p-6 space-y-5 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-main">
                {editingCard ? t('creditCards.modal.edit') : t('creditCards.modal.new')}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm() }} className="text-muted hover:text-main p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={cls.label}>{t('creditCards.field.name')}</label>
                <input className={cls.input} placeholder={t('creditCards.field.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>{t('creditCards.field.limit')}</label>
                  <CurrencyInput value={limit} onChange={setLimit} placeholder="10.000,00" className={cls.input} required />
                </div>
                <div>
                  <label className={cls.label}>{t('creditCards.field.brand')}</label>
                  <select className={cls.input} value={brand} onChange={(e) => setBrand(e.target.value)}>
                    {BRAND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>{t('creditCards.field.closingDay')}</label>
                  <input type="number" min="1" max="31" className={cls.input} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} required />
                </div>
                <div>
                  <label className={cls.label}>{t('creditCards.field.dueDay')}</label>
                  <input type="number" min="1" max="31" className={cls.input} value={dueDay} onChange={(e) => setDueDay(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className={cls.label}>{t('creditCards.field.color')}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COLOR_VALUES.map((value) => (
                    <button
                      key={value} type="button" title={t(`creditCards.color.${value}`)}
                      onClick={() => setColor(value)}
                      className={`h-8 w-8 rounded-full bg-gradient-to-br ${CARD_GRADIENTS[value]} ring-2 ring-offset-2 ring-offset-surface transition-all ${
                        color === value ? 'ring-brand scale-110' : 'ring-transparent hover:ring-border'
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
                      onClick={() => { setShowForm(false); setDeleteTarget(editingCard); setDeleteError(null) }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                    >
                      <X className="h-3.5 w-3.5" /> {t('creditCards.deleteCard')}
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background transition-colors">
                    {t('common.cancel')}
                  </button>
                  <button type="submit" disabled={saving} className={cls.btnPrimary}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('crud.saving')}</> : editingCard ? t('crud.save') : t('settings.categories.add')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Confirmar Exclusão ── */}
      {deleteTarget && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className={`${cls.surface} w-full max-w-md p-6 space-y-4 shadow-2xl`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-main">{t('creditCards.deleteTitle')}</h2>
                <p className="text-xs text-muted">{deleteTarget.name}</p>
              </div>
            </div>
            <p className="text-sm text-muted">{t('creditCards.deleteDesc')}</p>
            {deleteError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{deleteError}</div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => { setDeleteTarget(null); setDeleteError(null) }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('crud.processing')}</> : t('crud.delete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ── Modal Importar Fatura PDF ── */}
      <CardStatementImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        existingCards={cards}
        onSuccess={() => { fetchCards() }}
      />
    </div>
  )
}
