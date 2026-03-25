'use client'

import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  X, Upload, Loader2, CheckCircle2, AlertCircle, FileText,
  CreditCard, ChevronDown, ChevronUp, Check, Minus,
  Calendar, TrendingDown, Layers,
} from 'lucide-react'
import {
  parseCardStatement,
  confirmCardStatement,
  type ParsedCardStatement,
  type ParsedTransaction,
  type ConfirmStatementInput,
} from '@/lib/actions/parse-card-statement'
import { useToast } from '@/lib/toastContext'
import type { Database } from '@/types/supabase'

type Card = Database['public']['Tables']['credit_cards']['Row']

type TransactionRow = ParsedTransaction & { selected: boolean; id: string }

type Step = 'upload' | 'parsing' | 'review' | 'confirming' | 'done'

type Props = {
  open: boolean
  onClose: () => void
  existingCards: Card[]
  onSuccess: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  mercado: 'Mercado', alimentacao: 'Alimentação', compras: 'Compras',
  transporte: 'Transporte', combustivel: 'Combustível', veiculo: 'Veículo',
  assinaturas: 'Assinaturas', saude: 'Saúde', educacao: 'Educação',
  lazer: 'Lazer', moradia: 'Moradia', fatura_cartao: 'Fatura', outros: 'Outros',
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function fmtDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
function fmtMonthYear(iso: string) {
  const [y, m] = iso.split('-')
  return `${MONTH_NAMES[parseInt(m) - 1]}/${y}`
}
function fmtCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CardStatementImportModal({ open, onClose, existingCards, onSuccess }: Props) {
  const { toast, toastError } = useToast()
  const router = useRouter()

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const [parsed, setParsed] = useState<ParsedCardStatement | null>(null)
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [showAllTx, setShowAllTx] = useState(false)

  // Campos editáveis do cartão
  const [selectedCardId, setSelectedCardId] = useState<string>('__new__')
  const [cardName, setCardName] = useState('')
  const [creditLimit, setCreditLimit] = useState<string>('')
  const [closingDay, setClosingDay] = useState<string>('')
  const [dueDay, setDueDay] = useState<string>('')

  const [doneStats, setDoneStats] = useState({ imported: 0, projected: 0, cardId: '' })

  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('upload')
    setFile(null)
    setParseError(null)
    setConfirmError(null)
    setParsed(null)
    setTransactions([])
    setShowAllTx(false)
    setSelectedCardId('__new__')
    setCardName('')
    setCreditLimit('')
    setClosingDay('')
    setDueDay('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileChange = (f: File | null) => {
    if (!f) return
    if (f.type !== 'application/pdf') {
      setParseError('Apenas arquivos PDF são suportados.')
      return
    }
    setFile(f)
    setParseError(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    handleFileChange(f ?? null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleParse = async () => {
    if (!file) return
    setStep('parsing')
    setParseError(null)

    try {
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')

      const result = await parseCardStatement(base64, file.type)

      if (!result.success) {
        setParseError(result.error)
        setStep('upload')
        return
      }

      const data = result.data
      setParsed(data)

      // Pre-preenche campos do cartão
      setCardName(data.card_name)
      setCreditLimit(data.credit_limit?.toString() ?? '')
      setClosingDay(data.closing_day?.toString() ?? '')
      setDueDay(data.due_day?.toString() ?? '')

      // Tenta encontrar cartão existente pelo nome
      const match = existingCards.find((c) =>
        c.name.toLowerCase().includes(data.card_name.toLowerCase().split(' ')[0]) ||
        data.card_name.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
      )
      if (match) setSelectedCardId(match.id)
      else setSelectedCardId('__new__')

      setTransactions(
        data.transactions.map((t, i) => ({ ...t, selected: true, id: `tx-${i}` }))
      )
      setStep('review')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar PDF.'
      setParseError(msg)
      setStep('upload')
    }
  }

  const toggleTx = (id: string) => {
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, selected: !t.selected } : t))
  }
  const toggleAll = () => {
    const allSelected = transactions.every((t) => t.selected)
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: !allSelected })))
  }

  const selectedTotal = transactions.filter((t) => t.selected).reduce((s, t) => s + t.amount, 0)
  const selectedCount = transactions.filter((t) => t.selected).length
  const projectedCount = transactions.filter((t) => t.selected && t.installment_total && t.installment_total > 1 && t.installment_current).reduce((s, t) => s + (t.installment_total! - t.installment_current!), 0)

  const handleConfirm = async () => {
    setStep('confirming')
    setConfirmError(null)

    const input: ConfirmStatementInput = {
      card_id: selectedCardId === '__new__' ? null : selectedCardId,
      card_name: cardName.trim() || parsed?.card_name || 'Cartão importado',
      credit_limit: creditLimit ? Number(creditLimit) : null,
      closing_day: closingDay ? Number(closingDay) : null,
      due_day: dueDay ? Number(dueDay) : null,
      invoice_month: parsed?.invoice_month ?? null,
      transactions,
    }

    const result = await confirmCardStatement(input)

    if (!result.success) {
      setConfirmError(result.error)
      setStep('review')
      return
    }

    setDoneStats({ imported: result.imported, projected: result.projected, cardId: result.created_card_id })
    setStep('done')
    onSuccess()
  }

  const displayedTx = showAllTx ? transactions : transactions.slice(0, 8)

  if (!open) return null

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-modal-enter">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand/15 flex items-center justify-center shrink-0">
              <FileText className="h-4.5 w-4.5 text-brand" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-main">Importar fatura em PDF</h2>
              <p className="text-xs text-muted">
                {step === 'upload' && 'Selecione o PDF da fatura do cartão'}
                {step === 'parsing' && 'Analisando com Gemini AI...'}
                {step === 'review' && `${transactions.length} transações encontradas — revise e confirme`}
                {step === 'confirming' && 'Salvando...'}
                {step === 'done' && 'Importação concluída!'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:text-main hover:bg-hover transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP: upload ── */}
          {(step === 'upload' || step === 'parsing') && (
            <div className="p-6 space-y-5">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed transition-all p-10 flex flex-col items-center gap-3 text-center ${
                  dragOver
                    ? 'border-brand bg-brand/5 scale-[1.01]'
                    : file
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                    : 'border-border hover:border-brand/50 hover:bg-hover'
                }`}
              >
                {file ? (
                  <>
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-main">{file.name}</p>
                      <p className="text-xs text-muted mt-0.5">{(file.size / 1024).toFixed(0)} KB · PDF</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-brand" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-main">Arraste o PDF aqui ou clique para selecionar</p>
                      <p className="text-xs text-muted mt-1">Fatura de qualquer banco · apenas PDF</p>
                    </div>
                  </>
                )}
                <input ref={fileRef} type="file" accept="application/pdf" className="sr-only" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{parseError}</p>
                </div>
              )}

              {step === 'parsing' && (
                <div className="flex items-center gap-3 rounded-xl bg-brand/5 border border-brand/20 px-5 py-4">
                  <Loader2 className="h-5 w-5 text-brand animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-main">Gemini está lendo sua fatura…</p>
                    <p className="text-xs text-muted mt-0.5">Isso leva alguns segundos</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: review ── */}
          {(step === 'review' || step === 'confirming') && parsed && (
            <div className="divide-y divide-border">

              {/* Dados do cartão */}
              <div className="p-5 space-y-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Dados do cartão</p>

                {/* Vincular a cartão existente ou criar novo */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Cartão</label>
                  <select
                    value={selectedCardId}
                    onChange={(e) => {
                      const v = e.target.value
                      setSelectedCardId(v)
                      if (v !== '__new__') {
                        const c = existingCards.find((x) => x.id === v)
                        if (c) {
                          if (c.closing_day != null) setClosingDay(String(c.closing_day))
                          if (c.due_day != null) setDueDay(String(c.due_day))
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-background text-sm text-main px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="__new__">+ Criar novo cartão</option>
                    {existingCards.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Nome do cartão</label>
                    <input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background text-sm text-main px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                      placeholder="Ex: Nubank Platinum"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Limite (R$)</label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background text-sm text-main px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Dia de fechamento</label>
                    <input
                      type="number"
                      min={1} max={31}
                      value={closingDay}
                      onChange={(e) => setClosingDay(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background text-sm text-main px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Dia de vencimento</label>
                    <input
                      type="number"
                      min={1} max={31}
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background text-sm text-main px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                      placeholder="10"
                    />
                  </div>
                </div>

                {/* Resumo da fatura */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="rounded-xl bg-background/60 border border-border p-3 text-center">
                    <Calendar className="h-4 w-4 text-muted mx-auto mb-1" />
                    <p className="text-[10px] text-muted">Fatura</p>
                    <p className="text-xs font-bold text-main">{fmtMonthYear(parsed.invoice_month + '-01')}</p>
                  </div>
                  <div className="rounded-xl bg-background/60 border border-border p-3 text-center">
                    <TrendingDown className="h-4 w-4 text-red-400 mx-auto mb-1" />
                    <p className="text-[10px] text-muted">Total fatura</p>
                    <p className="text-xs font-bold text-main">{fmtCurrency(parsed.invoice_total)}</p>
                  </div>
                  <div className="rounded-xl bg-background/60 border border-border p-3 text-center">
                    <Layers className="h-4 w-4 text-brand mx-auto mb-1" />
                    <p className="text-[10px] text-muted">Transações</p>
                    <p className="text-xs font-bold text-main">{transactions.length}</p>
                  </div>
                </div>
              </div>

              {/* Lista de transações */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Transações ({selectedCount}/{transactions.length} selecionadas)
                  </p>
                  <button
                    onClick={toggleAll}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    {transactions.every((t) => t.selected) ? 'Desmarcar todas' : 'Marcar todas'}
                  </button>
                </div>

                <div className="space-y-1">
                  {displayedTx.map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => toggleTx(tx.id)}
                      className={`w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors border ${
                        tx.selected
                          ? 'bg-background border-border hover:bg-hover'
                          : 'bg-background/40 border-transparent opacity-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        tx.selected ? 'bg-brand border-brand' : 'border-border'
                      }`}>
                        {tx.selected && <Check className="h-3 w-3 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-main truncate">{tx.description}</p>
                        <p className="text-[10px] text-muted flex items-center gap-1.5 mt-0.5">
                          <span>{fmtDate(tx.date)}</span>
                          {tx.installment_total && tx.installment_total > 1 && (
                            <>
                              <span>·</span>
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                {tx.installment_current}/{tx.installment_total}x
                                {tx.installment_total - (tx.installment_current ?? 1) > 0 && (
                                  <span className="text-brand ml-1">
                                    (+{tx.installment_total - (tx.installment_current ?? 1)} futuras)
                                  </span>
                                )}
                              </span>
                            </>
                          )}
                          {tx.category_hint && (
                            <>
                              <span>·</span>
                              <span>{CATEGORY_LABELS[tx.category_hint] ?? tx.category_hint}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <span className="text-sm font-semibold text-main tabular-nums shrink-0">
                        {fmtCurrency(tx.amount)}
                      </span>
                    </button>
                  ))}

                  {transactions.length > 8 && (
                    <button
                      onClick={() => setShowAllTx(!showAllTx)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-brand hover:underline"
                    >
                      {showAllTx ? (
                        <><ChevronUp className="h-3.5 w-3.5" /> Mostrar menos</>
                      ) : (
                        <><ChevronDown className="h-3.5 w-3.5" /> Ver mais {transactions.length - 8} transações</>
                      )}
                    </button>
                  )}
                </div>

                {/* Aviso sobre parcelas futuras */}
                {projectedCount > 0 && (
                  <div className="flex items-start gap-2 rounded-lg bg-brand/5 border border-brand/20 px-4 py-3">
                    <Layers className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                    <p className="text-xs text-main">
                      <span className="font-semibold">{projectedCount} parcelas futuras</span> serão projetadas automaticamente com base no ciclo do cartão.
                    </p>
                  </div>
                )}

                {confirmError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{confirmError}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP: done ── */}
          {step === 'done' && (
            <div className="p-10 flex flex-col items-center gap-5 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-main">Fatura importada!</h3>
                <p className="text-sm text-muted mt-1">
                  {doneStats.imported} transações importadas
                  {doneStats.projected > 0 && ` · ${doneStats.projected} parcelas futuras projetadas`}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { router.push(`/credit-cards/${doneStats.cardId}`); handleClose() }}
                  className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                >
                  <CreditCard className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                  Ver cartão
                </button>
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted hover:bg-hover transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'upload' || step === 'parsing' || step === 'review' || step === 'confirming') && (
          <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
            {step === 'review' && (
              <p className="text-xs text-muted">
                Total selecionado: <span className="font-semibold text-main">{fmtCurrency(selectedTotal)}</span>
              </p>
            )}
            {(step === 'upload' || step === 'parsing') && <div />}

            <div className="flex items-center gap-2 ml-auto">
              {step === 'review' && (
                <button
                  onClick={() => { setStep('upload'); setParsed(null) }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-hover transition-colors"
                >
                  Voltar
                </button>
              )}
              {(step === 'upload' || step === 'parsing') && (
                <button
                  disabled={!file || step === 'parsing'}
                  onClick={handleParse}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  <Loader2 className={`h-4 w-4 ${step === 'parsing' ? 'animate-spin' : 'hidden'}`} />
                  Analisar PDF
                </button>
              )}
              {(step === 'review' || step === 'confirming') && (
                <button
                  disabled={selectedCount === 0 || step === 'confirming'}
                  onClick={handleConfirm}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {step === 'confirming' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {step === 'confirming' ? 'Salvando…' : `Importar ${selectedCount} transações`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(content, document.body)
}
