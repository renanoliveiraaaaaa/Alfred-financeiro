'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import CurrencyInput from '@/components/CurrencyInput'
import { Loader2, Trash2, ArrowLeft, ExternalLink, Paperclip } from 'lucide-react'
import ConfirmDangerModal from '@/components/ConfirmDangerModal'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun } from '@/lib/greeting'
import {
  detectExpenseContextMismatch,
  resolveTargetOrganization,
  type UserOrgRef,
} from '@/lib/transactionAuditor'
import ExpenseContextMoveButton from '@/components/ExpenseContextMoveButton'

const DEFAULT_CATEGORIES = [
  { value: 'mercado', label: 'Mercado' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'compras', label: 'Compras online' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'assinaturas', label: 'Assinaturas' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'moradia', label: 'Moradia' },
  { value: 'fatura_cartao', label: 'Fatura de cartão' },
  { value: 'outros', label: 'Outros' },
]

const PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'especie', label: 'Espécie / Dinheiro' },
  { value: 'credito_parcelado', label: 'Crédito parcelado' },
] as const

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export default function EditExpensePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createSupabaseClient()
  const { toastError } = useToast()
  const pronoun = useGreetingPronoun()

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [fetching, setFetching] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('outros')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('debito')
  const [dueDate, setDueDate] = useState('')
  const [paid, setPaid] = useState(false)
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [installmentInfo, setInstallmentInfo] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [expenseOrgId, setExpenseOrgId] = useState<string | null>(null)
  const [userOrgs, setUserOrgs] = useState<UserOrgRef[]>([])

  const loadExpense = useCallback(async () => {
    setFetching(true)
    try {
      const [{ data: expense, error: fetchErr }, { data: cats }] = await Promise.all([
        supabase.from('expenses').select('*').eq('id', id).single(),
        supabase.from('categories').select('name').order('name', { ascending: true }),
      ])

      if (fetchErr || !expense) {
        setNotFound(true)
        return
      }

      if (cats && cats.length > 0) {
        const userCats = cats.map((c: { name: string }) => ({ value: c.name, label: c.name }))
        setCategories([...DEFAULT_CATEGORIES, ...userCats])
      }

      setAmount(Number(expense.amount || 0))
      setDescription(expense.description || '')
      setCategory(expense.category || 'outros')
      setPaymentMethod((expense.payment_method || 'debito') as PaymentMethod)
      setDueDate(expense.due_date || '')
      setPaid(expense.paid ?? false)
      setInvoiceUrl(expense.invoice_url || null)

      if (expense.installments && expense.installment_number) {
        setInstallmentInfo(`Parcela ${expense.installment_number}/${expense.installments}`)
      }

      setExpenseOrgId(expense.organization_id ?? null)

      const { data: auth } = await supabase.auth.getUser()
      if (auth.user) {
        const { data: links } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('profile_id', auth.user.id)
        const memIds = [...new Set((links ?? []).map((l) => l.organization_id))]
        if (memIds.length > 0) {
          const { data: orgs } = await supabase
            .from('organizations')
            .select('id, type, name')
            .in('id', memIds)
          setUserOrgs(
            (orgs ?? []).map((o) => ({
              id: o.id,
              type: o.type as 'personal' | 'business',
              name:
                (o.name && o.name.trim()) || (o.type === 'personal' ? 'Minhas Finanças' : 'Empresa'),
            })),
          )
        } else {
          setUserOrgs([])
        }
      } else {
        setUserOrgs([])
      }
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : 'Erro ao carregar despesa.'
      setError(msg)
      toastError(msg)
    } finally {
      setFetching(false)
    }
  }, [supabase, id])

  useEffect(() => { loadExpense() }, [loadExpense])

  const contextMoveSuggestion = useMemo(() => {
    if (!expenseOrgId) return null
    const om = userOrgs.find((o) => o.id === expenseOrgId)
    if (!om) return null
    const mismatch = detectExpenseContextMismatch({
      description,
      category,
      organizationType: om.type,
    })
    if (!mismatch) return null
    const target = resolveTargetOrganization(mismatch.suggestedTarget, userOrgs)
    if (!target || target.id === expenseOrgId) return null
    return { targetId: target.id, targetName: target.name, hints: mismatch.matchedHints }
  }, [expenseOrgId, userOrgs, description, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (amount <= 0) { setError('Informe um valor maior que zero.'); return }
    if (!description.trim()) { setError('Informe uma descrição.'); return }
    if (!dueDate) { setError('Informe a data de vencimento.'); return }

    setSaving(true)
    try {
      let finalInvoiceUrl = invoiceUrl

      if (file) {
        const { data: userData, error: authErr } = await supabase.auth.getUser()
        if (authErr || !userData.user) throw new Error('Usuário não autenticado.')

        const ext = file.name.split('.').pop() || 'bin'
        const filePath = `${userData.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('invoices')
          .upload(filePath, file, { upsert: false })
        if (uploadErr) throw new Error(`Falha no upload: ${uploadErr.message}`)

        const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(filePath)
        finalInvoiceUrl = urlData.publicUrl
      }

      const { error: updateErr } = await supabase
        .from('expenses')
        .update({
          amount,
          description: description.trim(),
          category,
          payment_method: paymentMethod,
          due_date: dueDate,
          paid,
          invoice_url: finalInvoiceUrl,
        })
        .eq('id', id)

      if (updateErr) throw new Error(updateErr.message)

      setSuccess(true)
      setTimeout(() => router.push('/expenses'), 800)
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao atualizar despesa.')
      setError(msg)
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const { error: deleteErr } = await supabase.from('expenses').delete().eq('id', id)
      if (deleteErr) throw new Error(deleteErr.message)
      router.push('/expenses')
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao excluir despesa.')
      setError(msg)
      toastError(msg)
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (fetching) {
    return (
      <div className="max-w-2xl space-y-6 bg-background min-h-screen p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-4 w-16 animate-pulse rounded bg-border" />
          <div className="h-6 w-40 animate-pulse rounded bg-border" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-24 animate-pulse rounded bg-border mb-2" />
              <div className="h-10 w-full animate-pulse rounded bg-border" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-2xl text-center py-16 bg-background min-h-screen p-6">
        <p className="text-muted mb-4">Registro não encontrado, {pronoun}.</p>
        <Link href="/expenses" className="text-sm text-brand hover:opacity-80 hover:underline">
          Retornar aos registros
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl bg-background min-h-screen p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-main transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="text-xl font-semibold text-main">Editar registro de saída</h1>
        {installmentInfo && (
          <span className="rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            {installmentInfo}
          </span>
        )}
      </div>

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Registro atualizado com sucesso! Redirecionando...
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {contextMoveSuggestion && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-main">
            <span className="font-medium text-brand">Conciliação:</span>{' '}
            esta saída parece mais adequada ao contexto «{contextMoveSuggestion.targetName}».
            {contextMoveSuggestion.hints.length > 0 && (
              <span className="block text-xs text-muted mt-1">
                Pistas: {contextMoveSuggestion.hints.slice(0, 4).join(', ')}
              </span>
            )}
          </p>
          <ExpenseContextMoveButton
            expenseId={id}
            targetOrgId={contextMoveSuggestion.targetId}
            targetLabel={contextMoveSuggestion.targetName}
            onMoved={() => loadExpense()}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm">
        {/* Valor */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-muted mb-1">
            Valor (R$) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted text-sm">R$</span>
            <CurrencyInput
              id="amount"
              value={amount}
              onChange={setAmount}
              placeholder="0,00"
              className="block w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm text-main placeholder-muted focus:border-brand focus:ring-1 focus:ring-brand"
              required
            />
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-muted mb-1">
            Descrição <span className="text-red-400">*</span>
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Supermercado, combustível..."
            className="block w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-main placeholder-muted focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Categoria + Pagamento */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-muted mb-1">
              Categoria <span className="text-red-400">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-main focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-muted mb-1">
              Método de pagamento <span className="text-red-400">*</span>
            </label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="block w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-main focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data de vencimento */}
        <div className="max-w-xs">
          <label htmlFor="dueDate" className="block text-sm font-medium text-muted mb-1">
            Data de vencimento <span className="text-red-400">*</span>
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="block w-full rounded-lg border border-border bg-background py-2 px-3 text-sm text-main focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Anexo existente + novo upload */}
        <div>
          <label className="block text-sm font-medium text-muted mb-1">
            Comprovativo anexo
          </label>

          {invoiceUrl && !file && (
            <div className="flex items-center gap-3 mb-2 rounded-lg border border-border bg-border px-3 py-2">
              <Paperclip className="h-4 w-4 text-muted shrink-0" />
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm text-brand hover:opacity-80 hover:underline"
              >
                Ver ficheiro atual
              </a>
              <ExternalLink className="h-3.5 w-3.5 text-muted shrink-0" />
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex-1 cursor-pointer">
              <div className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors ${
                file
                  ? 'border-brand/40 bg-brand/15 text-brand'
                  : 'border-border text-muted hover:border-brand/50 hover:bg-background'
              }`}>
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <span className="truncate">
                  {file ? file.name : invoiceUrl ? 'Substituir ficheiro' : 'Selecionar ficheiro (imagem ou PDF)'}
                </span>
              </div>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {file && (
              <button type="button" onClick={() => setFile(null)} className="text-xs text-red-600 dark:text-red-400 hover:text-red-300 shrink-0">
                Remover
              </button>
            )}
          </div>
            {file && (
            <p className="mt-1 text-xs text-muted">
              {(file.size / 1024).toFixed(0)} KB · {file.type || 'arquivo'}
            </p>
          )}
        </div>

        {/* Pago */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={paid}
            onClick={() => setPaid(!paid)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              paid ? 'bg-brand' : 'bg-border'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                paid ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <label className="text-sm font-medium text-muted select-none cursor-pointer" onClick={() => setPaid(!paid)}>
            Pago
          </label>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </button>
            <Link
              href="/expenses"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted hover:bg-background transition-colors"
          >
              Cancelar
            </Link>
          </div>

          <button
            type="button"
            disabled={saving || deleting}
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 transition-colors"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Excluir
          </button>
        </div>
      </form>

      <ConfirmDangerModal
        open={showDeleteModal}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  )
}
