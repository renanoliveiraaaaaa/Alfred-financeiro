'use client'

import { useState, useMemo, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  X,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  CheckSquare,
  Square,
} from 'lucide-react'
import { confirmImport } from '@/lib/actions/import-statement'
import { useToast } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'

export interface ReviewTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'revenue' | 'expense'
  suggested_category?: string
  original_text: string
  /** ex.: credit_card_bill — vindo do parser + heurísticas */
  detected_kind?: string
  /** Rótulo amigável: "Pagamento de fatura de cartão", etc. */
  import_hint?: string
  suggested_payment_method?: string
}

interface TransactionRow extends ReviewTransaction {
  selected: boolean
  editedDescription: string
  editedType: 'revenue' | 'expense'
  editedCategory: string
  editedPaymentMethod: string
}

function defaultPaymentFromImport(t: ReviewTransaction): string {
  const s = t.suggested_payment_method
  if (s === 'pix' || s === 'debito' || s === 'credito' || s === 'especie') return s
  return 'debito'
}

interface Props {
  open: boolean
  onClose: () => void
  transactions: ReviewTransaction[]
  bank: string
  fileName: string
}

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
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function fmtAmount(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function monthKey(iso: string) {
  return iso.substring(0, 7) // YYYY-MM
}

function monthLabel(key: string) {
  if (!key || !/^\d{4}-\d{2}$/.test(key)) return '—'
  const [year, month] = key.split('-')
  const mi = parseInt(month, 10)
  if (!year || Number.isNaN(mi) || mi < 1 || mi > 12) return '—'
  return `${MONTH_NAMES[mi - 1]}/${year}`
}

function mapToRows(transactions: ReviewTransaction[]): TransactionRow[] {
  return transactions.map((t) => ({
    ...t,
    selected: true,
    editedDescription: t.description,
    editedType: t.type,
    editedCategory: t.suggested_category ?? 'outros',
    editedPaymentMethod: defaultPaymentFromImport(t),
  }))
}

export default function ImportReviewModal({ open, onClose, transactions, bank, fileName }: Props) {
  const router = useRouter()
  const { toastError } = useToast()
  const pronoun = useGreetingPronoun()

  /** useState só roda na 1ª montagem; o modal costuma montar com transactions=[] antes do parse — precisamos sincronizar quando abrir com dados */
  const [rows, setRows] = useState<TransactionRow[]>([])

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Agrupa por mês
  const months = useMemo(() => {
    const keys = Array.from(new Set(rows.map((r) => monthKey(r.date)))).sort()
    return keys
  }, [rows])

  const [activeMonth, setActiveMonth] = useState('')

  useLayoutEffect(() => {
    if (!open) return
    const next = mapToRows(transactions)
    setRows(next)
    setSaved(false)
    const keys = Array.from(new Set(transactions.map((t) => monthKey(t.date)))).sort()
    setActiveMonth(keys[0] ?? '')
  }, [open, transactions])

  const monthRows = useMemo(
    () => rows.filter((r) => monthKey(r.date) === activeMonth),
    [rows, activeMonth],
  )

  const allSelectedInMonth = monthRows.length > 0 && monthRows.every((r) => r.selected)
  const someSelectedInMonth = monthRows.some((r) => r.selected)

  const totalSelectedInMonth = useMemo(() => {
    const expenses = monthRows
      .filter((r) => r.selected && r.editedType === 'expense')
      .reduce((s, r) => s + r.amount, 0)
    const revenues = monthRows
      .filter((r) => r.selected && r.editedType === 'revenue')
      .reduce((s, r) => s + r.amount, 0)
    return { expenses, revenues, balance: revenues - expenses, count: monthRows.filter((r) => r.selected).length }
  }, [monthRows])

  const grandTotal = useMemo(() => {
    const count = rows.filter((r) => r.selected).length
    const total = rows
      .filter((r) => r.selected)
      .reduce((s, r) => s + (r.editedType === 'expense' ? -r.amount : r.amount), 0)
    return { count, total }
  }, [rows])

  const updateRow = useCallback((id: string, patch: Partial<TransactionRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const toggleSelectAll = () => {
    const newVal = !allSelectedInMonth
    setRows((prev) =>
      prev.map((r) => (monthKey(r.date) === activeMonth ? { ...r, selected: newVal } : r)),
    )
  }

  const monthIdx = months.indexOf(activeMonth)

  const handleConfirmAll = async () => {
    await doConfirm(rows.filter((r) => r.selected))
  }

  const handleConfirmMonth = async () => {
    await doConfirm(monthRows.filter((r) => r.selected))
  }

  const doConfirm = async (selected: TransactionRow[]) => {
    if (selected.length === 0) {
      toastError('Nenhuma transação selecionada.')
      return
    }

    setSaving(true)

    // Calcula período
    const dates = selected.map((r) => r.date).sort()
    const period_start = dates[0]
    const period_end = dates[dates.length - 1]

    const result = await confirmImport({
      bank,
      file_name: fileName,
      period_start,
      period_end,
      transactions: selected.map((r) => ({
        date: r.date,
        description: r.editedDescription,
        amount: r.amount,
        type: r.editedType,
        category: r.editedType === 'expense' ? r.editedCategory : undefined,
        payment_method: r.editedType === 'expense' ? r.editedPaymentMethod : undefined,
      })),
    })

    setSaving(false)

    if (!result.success) {
      toastError(result.error)
      return
    }

    setSaved(true)
    setTimeout(() => {
      onClose()
      router.push('/expenses')
      router.refresh()
    }, 1500)
  }

  if (!open) return null

  const cls = {
    input: 'block w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors',
    select: 'block w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors',
  }

  const modal = (
    <div
      className="fixed inset-0 z-[999] flex flex-col bg-black/60 animate-backdrop-enter overflow-hidden"
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full h-full max-w-6xl mx-auto bg-surface border-x border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-main">Revisão de Extrato</h2>
            <p className="text-xs text-muted mt-0.5">
              {pronoun
                ? `Prezado(a) ${pronoun}, encontrei ${transactions.length} transações para revisar.`
                : `Encontrei ${transactions.length} transações para revisar.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Month tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveMonth(months[Math.max(0, monthIdx - 1)])}
            disabled={monthIdx === 0}
            className="p-1 rounded text-muted hover:text-main disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMonth(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                m === activeMonth
                  ? 'bg-brand text-white'
                  : 'text-muted hover:text-main hover:bg-background'
              }`}
            >
              {monthLabel(m)}
            </button>
          ))}
          <button
            onClick={() => setActiveMonth(months[Math.min(months.length - 1, monthIdx + 1)])}
            disabled={monthIdx === months.length - 1}
            className="p-1 rounded text-muted hover:text-main disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Month summary */}
        <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-border bg-background/50 shrink-0 text-xs">
          <div>
            <span className="text-muted">Receitas</span>
            <p className="font-semibold text-emerald-400">R$ {fmtAmount(totalSelectedInMonth.revenues)}</p>
          </div>
          <div>
            <span className="text-muted">Despesas</span>
            <p className="font-semibold text-red-400">R$ {fmtAmount(totalSelectedInMonth.expenses)}</p>
          </div>
          <div>
            <span className="text-muted">Balanço</span>
            <p className={`font-semibold ${totalSelectedInMonth.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              R$ {fmtAmount(Math.abs(totalSelectedInMonth.balance))}
            </p>
          </div>
        </div>

        {/* Transactions list */}
        <div className="flex-1 overflow-y-auto">
          {/* Desktop table header */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 border-b border-border bg-background/30 text-xs font-medium text-muted uppercase tracking-wider shrink-0">
            <div className="w-8 flex justify-center">
              <button onClick={toggleSelectAll} className="text-muted hover:text-main transition-colors">
                {allSelectedInMonth ? (
                  <CheckSquare className="h-4 w-4 text-brand" />
                ) : someSelectedInMonth ? (
                  <CheckSquare className="h-4 w-4 text-muted" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="w-16">Data</div>
            <div className="flex-1">Descrição</div>
            <div className="w-24">Valor</div>
            <div className="w-24">Tipo</div>
            <div className="w-32">Categoria</div>
            <div className="w-28">Pagamento</div>
          </div>

          <div className="divide-y divide-border">
            {monthRows.map((row) => (
              <TransactionRowItem
                key={row.id}
                row={row}
                onUpdate={updateRow}
                cls={cls}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-3 bg-surface">
          {saved ? (
            <div className="flex items-center gap-2 justify-center text-sm text-emerald-400">
              <Check className="h-4 w-4" />
              Transações importadas com sucesso, {pronoun}!
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-muted">
                <span className="text-main font-medium">{grandTotal.count}</span> transações selecionadas
                {' · '}
                Total:{' '}
                <span className={grandTotal.total >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  R$ {fmtAmount(Math.abs(grandTotal.total))}
                </span>
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleConfirmMonth}
                  disabled={saving || totalSelectedInMonth.count === 0}
                  className="flex-1 sm:flex-none min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background disabled:opacity-40 transition-colors"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Confirmar {monthLabel(activeMonth)}
                </button>
                <button
                  onClick={handleConfirmAll}
                  disabled={saving || grandTotal.count === 0}
                  className="flex-1 sm:flex-none min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-40 transition-colors"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Confirmar todos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

// ─── Transaction row sub-component ────────────────────────────────────────────

interface RowProps {
  row: TransactionRow
  onUpdate: (id: string, patch: Partial<TransactionRow>) => void
  cls: { input: string; select: string }
}

function TransactionRowItem({ row, onUpdate, cls }: RowProps) {
  return (
    <>
      {/* Desktop row */}
      <div
        className={`hidden md:flex items-center gap-2 px-4 py-2 transition-colors ${
          row.selected ? '' : 'opacity-40'
        }`}
      >
        <div className="w-8 flex justify-center">
          <button
            onClick={() => onUpdate(row.id, { selected: !row.selected })}
            className="text-muted hover:text-main transition-colors"
          >
            {row.selected ? (
              <CheckSquare className="h-4 w-4 text-brand" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="w-16 text-xs text-muted shrink-0">{fmtDate(row.date)}</div>

        <div className="flex-1 min-w-0 space-y-1">
          <input
            className={cls.input}
            value={row.editedDescription}
            onChange={(e) => onUpdate(row.id, { editedDescription: e.target.value })}
          />
          {row.import_hint && (
            <p className="text-[10px] text-muted leading-tight">
              <span className="inline-flex items-center rounded-md bg-brand/10 text-brand px-1.5 py-0.5 font-medium">
                {row.import_hint}
              </span>
            </p>
          )}
        </div>

        <div className={`w-24 text-sm font-medium shrink-0 ${row.editedType === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
          {row.editedType === 'expense' ? '-' : '+'}R$ {row.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>

        <div className="w-24 shrink-0">
          <button
            onClick={() =>
              onUpdate(row.id, {
                editedType: row.editedType === 'expense' ? 'revenue' : 'expense',
              })
            }
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              row.editedType === 'expense'
                ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
            }`}
          >
            {row.editedType === 'expense' ? (
              <><ArrowDownLeft className="h-3 w-3" /> Despesa</>
            ) : (
              <><ArrowUpRight className="h-3 w-3" /> Receita</>
            )}
          </button>
        </div>

        <div className="w-32 shrink-0">
          {row.editedType === 'expense' ? (
            <select
              className={cls.select}
              value={row.editedCategory}
              onChange={(e) => onUpdate(row.id, { editedCategory: e.target.value })}
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
        </div>

        <div className="w-28 shrink-0">
          {row.editedType === 'expense' ? (
            <select
              className={cls.select}
              value={row.editedPaymentMethod}
              onChange={(e) => onUpdate(row.id, { editedPaymentMethod: e.target.value })}
            >
              {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
        </div>
      </div>

      {/* Mobile card */}
      <div
        className={`md:hidden px-4 py-3 transition-colors ${
          row.selected ? '' : 'opacity-40'
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => onUpdate(row.id, { selected: !row.selected })}
            className="mt-0.5 shrink-0 text-muted hover:text-main transition-colors"
          >
            {row.selected ? (
              <CheckSquare className="h-4 w-4 text-brand" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted shrink-0">{fmtDate(row.date)}</span>
              <span className={`text-sm font-semibold shrink-0 ${row.editedType === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                {row.editedType === 'expense' ? '-' : '+'}R$ {row.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <input
              className={cls.input}
              value={row.editedDescription}
              onChange={(e) => onUpdate(row.id, { editedDescription: e.target.value })}
            />
            {row.import_hint && (
              <p className="text-[10px] text-muted">
                <span className="inline-flex items-center rounded-md bg-brand/10 text-brand px-1.5 py-0.5 font-medium">
                  {row.import_hint}
                </span>
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() =>
                  onUpdate(row.id, {
                    editedType: row.editedType === 'expense' ? 'revenue' : 'expense',
                  })
                }
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  row.editedType === 'expense'
                    ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                    : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                }`}
              >
                {row.editedType === 'expense' ? (
                  <><ArrowDownLeft className="h-3 w-3" /> Despesa</>
                ) : (
                  <><ArrowUpRight className="h-3 w-3" /> Receita</>
                )}
              </button>

              {row.editedType === 'expense' && (
                <>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs text-main focus:outline-none"
                    value={row.editedCategory}
                    onChange={(e) => onUpdate(row.id, { editedCategory: e.target.value })}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs text-main focus:outline-none"
                    value={row.editedPaymentMethod}
                    onChange={(e) => onUpdate(row.id, { editedPaymentMethod: e.target.value })}
                  >
                    {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
