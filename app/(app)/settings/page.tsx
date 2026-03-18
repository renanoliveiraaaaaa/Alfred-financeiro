'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import type { Database } from '@/types/supabase'

type Category = Database['public']['Tables']['categories']['Row']

export default function SettingsPage() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
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
      })

      if (insertErr) {
        if (insertErr.code === '23505') {
          setError('Esta categoria já consta nos seus registros, senhor.')
        } else {
          throw insertErr
        }
      } else {
        setNewName('')
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

  return (
    <div className="max-w-2xl space-y-8 bg-white dark:bg-manor-950">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-manor-400 mt-0.5">Gerencie suas categorias e preferências pessoais, senhor</p>
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
      <div className="rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 shadow-sm">
        <div className="border-b border-gray-200 dark:border-manor-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Categorias pessoais</h2>
          <p className="text-xs text-gray-400 dark:text-manor-500 mt-0.5">
            Classificações sob medida para organizar suas obrigações
          </p>
        </div>

        {/* Formulário inline */}
        <form onSubmit={handleAdd} className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-manor-800">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da categoria"
            className="flex-1 rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 py-2 px-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold-600 dark:bg-gold-500 px-4 py-2 text-sm font-medium text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 disabled:opacity-50 shrink-0"
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
              <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-manor-800 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-manor-800 animate-pulse" />
              <div className="h-10 w-3/4 rounded-lg bg-gray-200 dark:bg-manor-800 animate-pulse" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-manor-500">
              Nenhuma categoria registrada, senhor. Utilize o formulário acima para criar a primeira.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-manor-800">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between py-3 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold-100 dark:bg-gold-500/15 text-gold-500 dark:text-gold-400 text-sm font-semibold">
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</span>
                  </div>
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
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rodapé com contagem */}
        {categories.length > 0 && (
          <div className="border-t border-gray-200 dark:border-manor-800 px-6 py-3">
            <p className="text-xs text-gray-400 dark:text-manor-500">{categories.length} categoria{categories.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </div>
  )
}
