'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { maskCurrency, parseBRL } from '@/lib/format'
import { createExpense } from '@/lib/actions/expenses'
import { createSupabaseClient } from '@/lib/supabaseClient'
import type { Database } from '@/types/supabase'

type CreditCard = Database['public']['Tables']['credit_cards']['Row']

const DEFAULT_CATEGORIES = [
  { value: 'mercado', label: 'Mercado' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'manutencao_carro', label: 'Manutenção do carro' },
  { value: 'outros', label: 'Outros' },
]

const PAYMENT_METHODS = [
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'especie', label: 'Espécie / Dinheiro' },
  { value: 'credito_parcelado', label: 'Crédito parcelado' },
] as const

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

const KEYWORD_MAP: Record<string, string> = {
  uber: 'transporte',
  '99': 'transporte',
  cabify: 'transporte',
  ifood: 'alimentacao',
  rappi: 'alimentacao',
  restaurante: 'alimentacao',
  lanche: 'alimentacao',
  almoço: 'alimentacao',
  almoco: 'alimentacao',
  jantar: 'alimentacao',
  padaria: 'alimentacao',
  netflix: 'assinaturas',
  spotify: 'assinaturas',
  disney: 'assinaturas',
  hbo: 'assinaturas',
  prime: 'assinaturas',
  youtube: 'assinaturas',
  posto: 'combustivel',
  gasolina: 'combustivel',
  etanol: 'combustivel',
  combustível: 'combustivel',
  combustivel: 'combustivel',
  shell: 'combustivel',
  ipiranga: 'combustivel',
  amazon: 'compras',
  shopee: 'compras',
  mercado: 'mercado',
  supermercado: 'mercado',
  feira: 'mercado',
  hortifruti: 'mercado',
  farmácia: 'saude',
  farmacia: 'saude',
  médico: 'saude',
  medico: 'saude',
  consulta: 'saude',
  dentista: 'saude',
  luz: 'contas',
  energia: 'contas',
  água: 'contas',
  agua: 'contas',
  internet: 'contas',
  telefone: 'contas',
  celular: 'contas',
  aluguel: 'moradia',
  condomínio: 'moradia',
  condominio: 'moradia',
  oficina: 'manutencao_carro',
  mecânico: 'manutencao_carro',
  mecanico: 'manutencao_carro',
  pneu: 'manutencao_carro',
  borracharia: 'manutencao_carro',
  estacionamento: 'transporte',
  pedagio: 'transporte',
  pedágio: 'transporte',
}

export default function NewExpensePage() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])

  useEffect(() => {
    const loadData = async () => {
      const [catRes, cardRes] = await Promise.all([
        supabase.from('categories').select('name').order('name', { ascending: true }),
        supabase.from('credit_cards').select('*').order('name', { ascending: true }),
      ])
      if (catRes.data && catRes.data.length > 0) {
        const userCats = catRes.data.map((c: { name: string }) => ({
          value: c.name,
          label: c.name,
        }))
        setCategories([...DEFAULT_CATEGORIES, ...userCats])
      }
      if (cardRes.data) setCreditCards(cardRes.data as CreditCard[])
    }
    loadData()
  }, [supabase])

  const [amountDisplay, setAmountDisplay] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('outros')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('debito')
  const [installments, setInstallments] = useState(2)
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paid, setPaid] = useState(false)
  const [creditCardId, setCreditCardId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [autoSuggested, setAutoSuggested] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const manualCategoryRef = useRef(false)

  const isParcelado = paymentMethod === 'credito_parcelado'
  const isCredito = paymentMethod === 'credito' || paymentMethod === 'credito_parcelado'

  const handleCategoryChange = (value: string) => {
    setCategory(value)
    manualCategoryRef.current = true
    setAutoSuggested(false)
  }

  const suggestCategory = useCallback(async (text: string) => {
    if (!text.trim() || manualCategoryRef.current) return

    const words = text.toLowerCase().split(/\s+/)

    for (const word of words) {
      for (const [keyword, cat] of Object.entries(KEYWORD_MAP)) {
        if (word.includes(keyword)) {
          const valid = categories.some((c) => c.value === cat)
          if (valid) {
            setCategory(cat)
            setAutoSuggested(true)
            return
          }
        }
      }
    }

    const { data } = await supabase
      .from('expenses')
      .select('category')
      .ilike('description', `%${text.trim()}%`)
      .limit(1)

    if (data && data.length > 0 && data[0].category) {
      const match = data[0].category
      const valid = categories.some((c) => c.value === match)
      if (valid) {
        setCategory(match)
        setAutoSuggested(true)
      }
    }
  }, [supabase, categories])

  const handleDescriptionChange = (text: string) => {
    setDescription(text)
    manualCategoryRef.current = false
    setAutoSuggested(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => suggestCategory(text), 500)
  }

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountDisplay(maskCurrency(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const totalAmount = parseBRL(amountDisplay)
    if (totalAmount <= 0) { setError('Informe um valor maior que zero.'); return }
    if (!description.trim()) { setError('Informe uma descrição.'); return }
    if (!dueDate) { setError('Informe a data de vencimento.'); return }
    if (isParcelado && (installments < 2 || installments > 120)) {
      setError('Parcelas devem ser entre 2 e 120.')
      return
    }

    setSaving(true)
    try {
      let invoiceUrl: string | null = null

      if (file) {
        const { data: userData, error: authErr } = await supabase.auth.getUser()
        if (authErr || !userData.user) throw new Error('Usuário não autenticado.')

        const ext = file.name.split('.').pop() || 'bin'
        const filePath = `${userData.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('invoices')
          .upload(filePath, file, { upsert: false })
        if (uploadErr) throw new Error(`Falha no upload: ${uploadErr.message}`)

        const { data: urlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(filePath)
        invoiceUrl = urlData.publicUrl
      }

      const result = await createExpense({
        amount: totalAmount,
        description: description.trim(),
        category,
        payment_method: paymentMethod,
        installments: isParcelado ? installments : 1,
        due_date: dueDate,
        paid,
        invoice_url: invoiceUrl,
        credit_card_id: isCredito && creditCardId ? creditCardId : null,
      })

      if (!result.success) throw new Error(result.error)

      setSuccess(true)
      setTimeout(() => router.push('/expenses'), 800)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Erro ao salvar despesa.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl bg-white dark:bg-manor-950 min-h-screen p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-manor-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Registrar nova saída</h1>
      </div>

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {isParcelado
            ? `${installments} parcelas registradas com sucesso! Redirecionando...`
            : 'Saída registrada com sucesso! Redirecionando...'}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 p-6 shadow-sm">
        {/* Valor */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-600 dark:text-manor-400 mb-1">
            Valor (R$) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-manor-500 text-sm">R$</span>
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              value={amountDisplay}
              onChange={handleAmountChange}
              placeholder="0,00"
              className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 pl-10 pr-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            />
          </div>
          {isParcelado && parseBRL(amountDisplay) > 0 && (
            <p className="mt-1 text-xs text-gray-400 dark:text-manor-600">
              {installments}x de{' '}
              {(parseBRL(amountDisplay) / installments).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
          )}
        </div>

        {/* Descrição */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-600 dark:text-manor-400 mb-1">
            Descrição <span className="text-red-400">*</span>
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Ex.: Supermercado, combustível..."
            className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 px-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
          />
        </div>

        {/* Categoria + Método de pagamento */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-600 dark:text-manor-400 mb-1">
              Categoria <span className="text-red-400">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 px-3 text-sm text-gray-900 dark:text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {autoSuggested && (
              <p className="mt-1 flex items-center gap-1 text-xs text-gold-600 dark:text-gold-400 animate-fade-in">
                <span className="inline-block animate-pulse">✨</span> Categoria sugerida pelo Alfred
              </p>
            )}
          </div>
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-600 dark:text-manor-400 mb-1">
              Método de pagamento <span className="text-red-400">*</span>
            </label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 px-3 text-sm text-gray-900 dark:text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cartão de crédito */}
        {isCredito && creditCards.length > 0 && (
          <div>
            <label htmlFor="creditCard" className="block text-sm font-medium text-gray-600 dark:text-manor-400 mb-1">
              Cartão de crédito
            </label>
            <select
              id="creditCard"
              value={creditCardId}
              onChange={(e) => setCreditCardId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 px-3 text-sm text-gray-900 dark:text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            >
              <option value="">Nenhum (não vincular)</option>
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.brand ? ` · ${c.brand}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Parcelas (só aparece se crédito parcelado) */}
        {isParcelado && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Parcelamento</p>
            <div>
              <label htmlFor="installments" className="block text-sm font-medium text-gray-600 dark:text-manor-400 mb-1">
                Quantidade de parcelas
              </label>
              <input
                id="installments"
                type="number"
                min={2}
                max={120}
                value={installments}
                onChange={(e) => setInstallments(Math.max(2, parseInt(e.target.value) || 2))}
                className="block w-32 rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 px-3 text-sm text-gray-900 dark:text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              />
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Serão geradas {installments} entradas automáticas com vencimentos mensais a partir da data informada.
            </p>
          </div>
        )}

        {/* Data */}
        <div className="max-w-xs">
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-600 dark:text-manor-400 mb-1">
            {isParcelado && creditCardId ? 'Data da compra' : 'Data de vencimento'} <span className="text-red-400">*</span>
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 px-3 text-sm text-gray-900 dark:text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
          />
          {isParcelado && creditCardId && (() => {
            const card = creditCards.find((c) => c.id === creditCardId)
            return card ? (
              <p className="mt-1 text-xs text-gray-400 dark:text-manor-500">
                Os vencimentos serão calculados pelo ciclo do cartão (fecha dia {card.closing_day}, vence dia {card.due_day})
              </p>
            ) : null
          })()}
        </div>

        {/* Upload de fatura */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-manor-400 mb-1">
            Comprovativo anexo <span className="text-gray-400 dark:text-manor-600 font-normal">(opcional)</span>
          </label>
          <div className="flex items-center gap-3">
            <label className="flex-1 cursor-pointer">
              <div className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors ${
                file
                  ? 'border-gold-300 dark:border-gold-500/40 bg-gold-50 dark:bg-gold-500/10 text-gold-700 dark:text-gold-400'
                  : 'border-gray-300 dark:border-manor-700 text-gray-500 dark:text-manor-400 hover:border-manor-500 hover:bg-gray-100 dark:hover:bg-manor-800'
              }`}>
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <span className="truncate">
                  {file ? file.name : 'Selecionar ficheiro (imagem ou PDF)'}
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
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-300 shrink-0"
              >
                Remover
              </button>
            )}
          </div>
          {file && (
            <p className="mt-1 text-xs text-gray-400 dark:text-manor-600">
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
              paid ? 'bg-gold-500' : 'bg-gray-200 dark:bg-manor-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                paid ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <label className="text-sm font-medium text-gray-600 dark:text-manor-400 select-none cursor-pointer" onClick={() => setPaid(!paid)}>
            {isParcelado ? 'Primeira parcela já paga' : 'Já pago'}
          </label>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gold-600 dark:bg-gold-500 px-5 py-2.5 text-sm font-medium text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-manor-900 disabled:opacity-50"
          >
            {saving
              ? 'Processando...'
              : isParcelado
              ? `Registrar ${installments} parcelas`
              : 'Registrar saída'}
          </button>
          <Link
            href="/expenses"
            className="rounded-lg border border-gray-300 dark:border-manor-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
