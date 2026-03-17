'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react'
import { createExpense } from '@/lib/actions/expenses'
import { createRevenue } from '@/lib/actions/revenues'
import { parseBRL, maskCurrency } from '@/lib/format'

type Tab = 'expense' | 'revenue'

type Props = {
  open: boolean
  onClose: () => void
}

export default function QuickAddModal({ open, onClose }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('expense')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('outros')
  const [paymentMethod, setPaymentMethod] = useState('debito')
  const [paid, setPaid] = useState(false)
  const [received, setReceived] = useState(false)

  const reset = useCallback(() => {
    setAmount('')
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

    const value = parseBRL(amount)

    if (tab === 'expense') {
      const result = await createExpense({
        amount: value,
        description,
        category,
        payment_method: paymentMethod as any,
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

    setSaving(false)
    setSuccess(true)
    setTimeout(() => {
      handleClose()
      router.refresh()
    }, 800)
  }

  if (!open) return null

  const cls = {
    label: 'block text-xs font-medium text-gray-500 dark:text-manor-400 uppercase tracking-wider mb-1.5',
    input: 'block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 bg-black/50 px-4 animate-backdrop-enter" onClick={handleClose}>
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 shadow-2xl animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Novo lançamento</h2>
          <button onClick={handleClose} className="text-gray-400 dark:text-manor-500 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mx-5 rounded-lg bg-gray-100 dark:bg-manor-800 p-0.5">
          <button
            onClick={() => switchTab('expense')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              tab === 'expense'
                ? 'bg-white dark:bg-manor-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-manor-400 hover:text-gray-700 dark:hover:text-white'
            }`}
          >
            <ArrowDownLeft className="h-3.5 w-3.5" /> Despesa
          </button>
          <button
            onClick={() => switchTab('revenue')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              tab === 'revenue'
                ? 'bg-white dark:bg-manor-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-manor-400 hover:text-gray-700 dark:hover:text-white'
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Receita
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="h-3.5 w-3.5" /> Lançamento registrado, senhor.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cls.label}>Valor (R$)</label>
              <input
                className={cls.input}
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(maskCurrency(e.target.value))}
                required
                autoFocus
              />
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
              placeholder={tab === 'expense' ? 'Ex.: Almoço, Uber, Conta de luz...' : 'Ex.: Salário, Freelance, Rendimento...'}
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
                  <option value="combustivel">Combustível</option>
                  <option value="manutencao_carro">Manutenção carro</option>
                  <option value="alimentacao">Alimentação</option>
                  <option value="transporte">Transporte</option>
                  <option value="assinaturas">Assinaturas</option>
                  <option value="saude">Saúde</option>
                  <option value="educacao">Educação</option>
                  <option value="lazer">Lazer</option>
                  <option value="moradia">Moradia</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <label className={cls.label}>Pagamento</label>
                <select className={cls.input} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
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
                (tab === 'expense' ? paid : received) ? 'bg-gold-500' : 'bg-gray-200 dark:bg-manor-700'
              }`}
              onClick={() => tab === 'expense' ? setPaid(!paid) : setReceived(!received)}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  (tab === 'expense' ? paid : received) ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
            <span className="text-xs text-gray-600 dark:text-manor-300">
              {tab === 'expense' ? (paid ? 'Quitado' : 'Em aberto') : (received ? 'Recebido' : 'Pendente')}
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gold-600 dark:bg-gold-500 text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 disabled:opacity-50 transition-colors"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</> : success ? <><Check className="h-4 w-4" /> Registrado</> : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
