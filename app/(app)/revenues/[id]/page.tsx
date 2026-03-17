'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { maskCurrency, parseBRL } from '@/lib/format'
import { Loader2, Trash2, ArrowLeft } from 'lucide-react'
import ConfirmDangerModal from '@/components/ConfirmDangerModal'

function numberToMask(val: number): string {
  if (!val) return ''
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function EditRevenuePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createSupabaseClient()

  const [fetching, setFetching] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [amountDisplay, setAmountDisplay] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [received, setReceived] = useState(false)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const loadRevenue = useCallback(async () => {
    setFetching(true)
    try {
      const { data: revenue, error: fetchErr } = await supabase
        .from('revenues')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchErr || !revenue) {
        setNotFound(true)
        return
      }

      setAmountDisplay(numberToMask(Number(revenue.amount || 0)))
      setDescription(revenue.description || '')
      setDate(revenue.date || '')
      setExpectedDate(revenue.expected_date || '')
      setReceived(revenue.received ?? false)
    } catch {
      setError('Erro ao carregar receita.')
    } finally {
      setFetching(false)
    }
  }, [supabase, id])

  useEffect(() => { loadRevenue() }, [loadRevenue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const amount = parseBRL(amountDisplay)
    if (amount <= 0) { setError('Informe um valor maior que zero.'); return }
    if (!description.trim()) { setError('Informe uma descrição.'); return }
    if (!date) { setError('Informe a data efetiva.'); return }

    setSaving(true)
    try {
      const { error: updateErr } = await supabase
        .from('revenues')
        .update({
          amount,
          description: description.trim(),
          date,
          expected_date: expectedDate || null,
          received,
        })
        .eq('id', id)

      if (updateErr) throw new Error(updateErr.message)

      setSuccess(true)
      setTimeout(() => router.push('/revenues'), 800)
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar receita.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const { error: deleteErr } = await supabase.from('revenues').delete().eq('id', id)
      if (deleteErr) throw new Error(deleteErr.message)
      router.push('/revenues')
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir receita.')
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (fetching) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-manor-800" />
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-manor-800" />
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 p-6 shadow-sm space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-manor-800 mb-2" />
              <div className="h-10 w-full animate-pulse rounded bg-gray-200 dark:bg-manor-800" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-2xl text-center py-16">
        <p className="text-gray-600 dark:text-manor-400 mb-4">Registro não encontrado, senhor.</p>
        <Link href="/revenues" className="text-sm text-gray-600 dark:text-manor-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          Retornar aos registros
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/revenues"
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-manor-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Editar registro de entrada</h1>
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

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 p-6 shadow-sm">
        {/* Valor */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-600 dark:text-manor-300 mb-1">
            Valor (R$) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-manor-500 text-sm">R$</span>
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              value={amountDisplay}
              onChange={(e) => setAmountDisplay(maskCurrency(e.target.value))}
              placeholder="0,00"
              className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 pl-10 pr-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            />
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-600 dark:text-manor-300 mb-1">
            Descrição <span className="text-red-400">*</span>
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Salário, honorários..."
            className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 px-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
          />
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-600 dark:text-manor-300 mb-1">
              Data efetiva <span className="text-red-400">*</span>
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 px-3 text-sm text-gray-900 dark:text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            />
          </div>
          <div>
            <label htmlFor="expectedDate" className="block text-sm font-medium text-gray-600 dark:text-manor-300 mb-1">
              Data esperada <span className="text-gray-400 dark:text-manor-500 font-normal">(opcional)</span>
            </label>
            <input
              id="expectedDate"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 px-3 text-sm text-gray-900 dark:text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            />
          </div>
        </div>

        {/* Recebido */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={received}
            onClick={() => setReceived(!received)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              received ? 'bg-gold-500' : 'bg-gray-200 dark:bg-manor-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                received ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <label className="text-sm font-medium text-gray-600 dark:text-manor-300 select-none cursor-pointer" onClick={() => setReceived(!received)}>
            Já recebido
          </label>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-gold-600 dark:bg-gold-500 px-5 py-2.5 text-sm font-medium text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-manor-900 disabled:opacity-50 transition-colors"
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
              href="/revenues"
            className="rounded-lg border border-gray-300 dark:border-manor-700 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors"
          >
              Cancelar
            </Link>
          </div>

          <button
            type="button"
            disabled={saving || deleting}
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-manor-900 disabled:opacity-50 transition-colors"
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
