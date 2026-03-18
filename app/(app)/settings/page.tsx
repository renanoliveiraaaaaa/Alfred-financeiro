'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import CurrencyInput from '@/components/CurrencyInput'
import { useUserPreferences } from '@/lib/userPreferencesContext'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { useGreetingPronoun, getGreetingSuffix } from '@/lib/greeting'
import { Pencil, Loader2, X } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Category = Database['public']['Tables']['categories']['Row']

export default function SettingsPage() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()
  const { gender } = useUserPreferences()
  const pronoun = useGreetingPronoun()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editBudget, setEditBudget] = useState(0)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const clearMessages = () => { setError(null); setSuccess(null) }

  const fetchCategories = useCallback(async () => {
    const { data, error: fetchErr } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (fetchErr) {
      const msg = isConnectionError(fetchErr) ? CONNECTION_ERROR_MSG : 'Erro ao carregar categorias.'
      setError(msg)
      toastError(msg)
    } else {
      setCategories((data ?? []) as Category[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    const trimmed = newName.trim()
    if (!trimmed) { setError('Digite o nome da categoria.'); return }

    setSaving(true)
    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !userData.user) throw new Error('Usuário não autenticado.')

      const { error: insertErr } = await supabase.from('categories').insert({
        user_id: userData.user.id,
        name: trimmed,
        monthly_budget: newBudget > 0 ? newBudget : null,
      })

      if (insertErr) {
        if (insertErr.code === '23505') {
          setError(`Esta categoria já consta nos seus registros${getGreetingSuffix(gender)}.`)
        } else {
          throw insertErr
        }
      } else {
        setNewName('')
        setNewBudget(0)
        setSuccess('Categoria registrada com distinção.')
        await fetchCategories()
      }
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao criar categoria.')
      setError(msg)
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    clearMessages()
    setDeletingId(id)
    try {
      const { error: delErr } = await supabase.from('categories').delete().eq('id', id)
      if (delErr) throw delErr
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setSuccess('Categoria removida dos seus registros.')
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao remover categoria.')
      setError(msg)
      toastError(msg)
    } finally {
      setDeletingId(null)
    }
  }

  const openEditBudget = (cat: Category) => {
    setEditId(cat.id)
    setEditBudget(Number(cat.monthly_budget) || 0)
  }

  const handleSaveBudget = async () => {
    if (!editId) return
    setSavingEdit(true)
    clearMessages()
    try {
      const budget = editBudget > 0 ? editBudget : 0
      const { error } = await supabase
        .from('categories')
        .update({ monthly_budget: budget })
        .eq('id', editId)
      if (error) throw error
      setCategories((prev) =>
        prev.map((c) => (c.id === editId ? { ...c, monthly_budget: budget } : c))
      )
      setSuccess('Orçamento atualizado com distinção.')
      setEditId(null)
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : 'Erro ao atualizar.')
      setError(msg)
      toastError(msg)
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8 bg-background">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-main">Configurações</h1>
        <p className="text-sm text-muted mt-0.5">Gerencie suas categorias e preferências pessoais, senhor</p>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:text-red-300 ml-4">✕</button>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 ml-4">✕</button>
        </div>
      )}

      {/* Card Categorias */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-main">Categorias pessoais</h2>
          <p className="text-xs text-muted mt-0.5">
            Classificações sob medida para organizar suas obrigações
          </p>
        </div>

        {/* Formulário inline */}
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-6 py-4 border-b border-border">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da categoria"
            className="flex-1 rounded-lg border border-border bg-background py-2 px-3 text-sm text-main placeholder-muted focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <CurrencyInput
            value={newBudget}
            onChange={setNewBudget}
            placeholder="Orçamento mensal (R$) — opcional"
            className="w-full sm:w-44 rounded-lg border border-border bg-background py-2 px-3 text-sm text-main placeholder-muted focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {saving ? (
              'Processando...'
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Adicionar
              </>
            )}
          </button>
        </form>

        {/* Lista */}
        <div className="px-6 py-2">
          {loading ? (
            <div className="py-8 space-y-3">
              <div className="h-10 w-full rounded-lg bg-border animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-border animate-pulse" />
              <div className="h-10 w-3/4 rounded-lg bg-border animate-pulse" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              Nenhuma categoria registrada{getGreetingSuffix(gender)}. Utilize o formulário acima para criar a primeira.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between py-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-brand text-sm font-semibold shrink-0">
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-main block truncate">{cat.name}</span>
                      {cat.monthly_budget != null && Number(cat.monthly_budget) > 0 && (
                        <span className="text-xs text-muted">
                          Limite: {Number(cat.monthly_budget).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditBudget(cat)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-lg text-muted hover:text-brand hover:bg-brand/15"
                      title="Definir orçamento mensal"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deletingId === cat.id ? (
                      'Removendo...'
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                        Remover
                      </>
                    )}
                  </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Modal Editar Orçamento */}
        {editId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="rounded-xl border border-border bg-surface w-full max-w-sm p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-main">Orçamento Mensal (R$)</h3>
                <button
                  onClick={() => { setEditId(null); setEditBudget(0) }}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-muted hover:text-main hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted">
                {categories.find((c) => c.id === editId)?.name} — defina o teto de gastos para acompanhar no Dashboard.
              </p>
              <CurrencyInput
                value={editBudget}
                onChange={setEditBudget}
                placeholder="0,00"
                className="block w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm text-main placeholder-muted focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setEditId(null); setEditBudget(0) }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveBudget}
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé com contagem */}
        {categories.length > 0 && (
          <div className="border-t border-border px-6 py-3">
            <p className="text-xs text-muted">{categories.length} categoria{categories.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </div>
  )
}
