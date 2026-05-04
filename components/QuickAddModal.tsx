'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X, Loader2, ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react'
import { createExpense, type CreateExpenseInput } from '@/lib/actions/expenses'
import { createRevenue } from '@/lib/actions/revenues'
import CurrencyInput from '@/components/CurrencyInput'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'
import { useUserPreferences } from '@/lib/userPreferencesContext'

type Tab = 'expense' | 'revenue'

type Props = {
  open: boolean
  onClose: () => void
}

export default function QuickAddModal({ open, onClose }: Props) {
  const router = useRouter()
  const { toastError } = useToast()
  const pronoun = useGreetingPronoun()
  const { activeOrgType } = useUserPreferences()
  const isBusiness = activeOrgType === 'business'
  const [tab, setTab] = useState<Tab>('expense')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('outros')
  const [paymentMethod, setPaymentMethod] = useState('debito')
  const [paid, setPaid] = useState(false)
  const [received, setReceived] = useState(false)

  const reset = useCallback(() => {
    setAmount(0)
    setDescription('')
    setDate(new Date().toISOString().slice(0, 10))
    setCategory('outros')
    setPaymentMethod('debito')
    setPaid(false)
    setReceived(false)
    setError(null)
    setSuccess(false)
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    reset()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const value = amount

    try {
      if (tab === 'expense') {
        const result = await createExpense({
          amount: value,
          description,
          category,
          payment_method: paymentMethod as CreateExpenseInput['payment_method'],
          installments: 1,
          due_date: date,
          paid,
        })
        if (!result.success) {
          setError(result.error)
          setSaving(false)
          return
        }
      } else {
        const result = await createRevenue({
          amount: value,
          description,
          date,
          expected_date: null,
          received,
        })
        if (!result.success) {
          setError(result.error)
          setSaving(false)
          return
        }
      }

      setSuccess(true)
      setTimeout(() => {
        handleClose()
        router.refresh()
      }, 800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado.'
      setError(isConnectionError(err) ? CONNECTION_ERROR_MSG : msg)
      toastError(isConnectionError(err) ? CONNECTION_ERROR_MSG : msg)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const cls = {
    label: 'block text-xs font-medium text-muted uppercase tracking-wider mb-1.5',
    input: 'block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors',
  }

  const modal = (
    <div className="fixed inset-0 z-[999] flex flex-col sm:items-start sm:justify-center sm:pt-24 bg-black/50 px-0 sm:px-4 animate-backdrop-enter overflow-y-auto" onClick={handleClose}>
      <div
        className="w-full min-h-full sm:min-h-0 sm:max-w-md sm:rounded-xl sm:my-4 border-0 sm:border border-border bg-surface shadow-2xl animate-modal-enter flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-base font-semibold text-main">Novo lançamento</h2>
          <button
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted hover:text-main hover:bg-background transition-colors touch-manipulation"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mx-5 rounded-lg bg-border p-0.5">
          <button
            onClick={() => switchTab('expense')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              tab === 'expense'
                ? 'bg-surface text-main shadow-sm'
                : 'text-muted hover:text-main'
            }`}
          >
            <ArrowDownLeft className="h-3.5 w-3.5" /> {isBusiness ? 'Custo / Despesa' : 'Despesa'}
          </button>
          <button
            onClick={() => switchTab('revenue')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              tab === 'revenue'
                ? 'bg-surface text-main shadow-sm'
                : 'text-muted hover:text-main'
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> {isBusiness ? 'Faturamento' : 'Receita'}
          </button>
        </div>

        {/* Form - scrollável no mobile */}
        <form onSubmit={handleSubmit} className="p-5 pb-8 sm:pb-5 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="h-3.5 w-3.5" /> Lançamento registrado, {pronoun}.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cls.label}>Valor (R$)</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted text-sm">R$</span>
                <CurrencyInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="0,00"
                  className={`${cls.input} pl-10`}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className={cls.label}>Data</label>
              <input type="date" className={cls.input} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className={cls.label}>Descrição</label>
            <input
              className={cls.input}
              placeholder={tab === 'expense'
                ? (isBusiness ? 'Ex.: Fornecedor, Aluguel escritório, AWS...' : 'Ex.: Almoço, Uber, Conta de luz...')
                : (isBusiness ? 'Ex.: NF #1234, Venda produto, Serviço prestado...' : 'Ex.: Salário, Freelance, Rendimento...')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {tab === 'expense' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cls.label}>Categoria</label>
                <select className={cls.input} value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="mercado">Mercado</option>
                  <option value="alimentacao">Alimentação</option>
                  <option value="compras">Compras online</option>
                  <option value="transporte">Transporte</option>
                  <option value="combustivel">Combustível</option>
                  <option value="veiculo">Veículo</option>
                  <option value="assinaturas">Assinaturas</option>
                  <option value="saude">Saúde</option>
                  <option value="educacao">Educação</option>
                  <option value="lazer">Lazer</option>
                  <option value="moradia">Moradia</option>
                  <option value="fatura_cartao">Fatura de cartão</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <label className={cls.label}>Pagamento</label>
                <select className={cls.input} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="pix">Pix</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                  <option value="especie">Espécie</option>
                </select>
              </div>
            </div>
          )}

          {/* Status toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                (tab === 'expense' ? paid : received) ? 'bg-brand' : 'bg-border'
              }`}
              onClick={() => tab === 'expense' ? setPaid(!paid) : setReceived(!received)}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-surface shadow transition-transform duration-200 ${
                  (tab === 'expense' ? paid : received) ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
            <span className="text-xs text-muted">
              {tab === 'expense' ? (paid ? 'Quitado' : 'Em aberto') : (received ? 'Recebido' : 'Pendente')}
            </span>
          </label>

          {/* Actions - touch targets 44px */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background transition-colors touch-manipulation"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50 transition-colors touch-manipulation"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</> : success ? <><Check className="h-4 w-4" /> Registrado</> : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
