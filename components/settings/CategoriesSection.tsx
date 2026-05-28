'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createSupabaseClient } from '@/lib/supabaseClient'
import CurrencyInput from '@/components/CurrencyInput'
import { useUserPreferences } from '@/lib/userPreferencesContext'
import { useToast, CONNECTION_ERROR_MSG, isConnectionError } from '@/lib/toastContext'
import { getGreetingSuffix } from '@/lib/greeting'
import { useI18n } from '@/lib/i18n'
import { formatMessage } from '@/lib/i18nFormat'
import { resolveActiveOrganizationIdForClient } from '@/lib/activeOrganizationClient'
import { Pencil, Loader2, X } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Category = Database['public']['Tables']['categories']['Row']

export default function CategoriesSection() {
  const supabase = createSupabaseClient()
  const { toastError } = useToast()
  const { gender } = useUserPreferences()
  const { t, locale } = useI18n()
  const suffix = getGreetingSuffix(gender)
  const fmtCurrency = (n: number) =>
    n.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR', { style: 'currency', currency: 'BRL' })

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

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const fetchCategories = useCallback(async () => {
    const { data: userData, error: authErr } = await supabase.auth.getUser()
    if (authErr || !userData.user) {
      setLoading(false)
      return
    }

    const orgId = await resolveActiveOrganizationIdForClient(supabase, userData.user.id)

    let query = supabase.from('categories').select('*').order('name', { ascending: true })
    if (orgId) query = query.eq('organization_id', orgId)

    const { data, error: fetchErr } = await query

    if (fetchErr) {
      const msg = isConnectionError(fetchErr) ? CONNECTION_ERROR_MSG : t('settings.error.load')
      setError(msg)
      toastError(msg)
    } else {
      setCategories((data ?? []) as Category[])
    }
    setLoading(false)
  }, [supabase, t, toastError])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    const trimmed = newName.trim()
    if (!trimmed) {
      setError(t('settings.error.nameRequired'))
      return
    }

    setSaving(true)
    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !userData.user) {
        setError(t('crud.error.auth'))
        setSaving(false)
        return
      }

      const orgId = await resolveActiveOrganizationIdForClient(supabase, userData.user.id)
      if (!orgId) {
        setError(t('error.orgNotFound'))
        setSaving(false)
        return
      }

      const { error: insertErr } = await supabase.from('categories').insert({
        user_id: userData.user.id,
        organization_id: orgId,
        name: trimmed,
        monthly_budget: newBudget > 0 ? newBudget : null,
      })

      if (insertErr) {
        if (insertErr.code === '23505') {
          setError(formatMessage(t('settings.error.duplicate'), { suffix }))
        } else {
          throw insertErr
        }
      } else {
        setNewName('')
        setNewBudget(0)
        setSuccess(t('settings.success.created'))
        await fetchCategories()
      }
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : t('settings.error.create'))
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
      setSuccess(t('settings.success.deleted'))
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : t('settings.error.delete'))
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
      const { error } = await supabase.from('categories').update({ monthly_budget: budget }).eq('id', editId)
      if (error) throw error
      setCategories((prev) => prev.map((c) => (c.id === editId ? { ...c, monthly_budget: budget } : c)))
      setSuccess(t('settings.success.budgetUpdated'))
      setEditId(null)
    } catch (err: unknown) {
      const msg = isConnectionError(err) ? CONNECTION_ERROR_MSG : (err instanceof Error ? err.message : t('error.updateFailed'))
      setError(msg)
      toastError(msg)
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-4 text-red-600 dark:text-red-400">
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {success}
          <button type="button" onClick={() => setSuccess(null)} className="ml-4 text-emerald-600 dark:text-emerald-400">
            ✕
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface shadow-sm glass-card">
        <form
          onSubmit={handleAdd}
          className="flex flex-col items-stretch gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:px-6"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('settings.categories.namePlaceholder')}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-main placeholder-muted focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <CurrencyInput
            value={newBudget}
            onChange={setNewBudget}
            placeholder={t('settings.categories.budgetPlaceholder')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-main placeholder-muted focus:border-brand focus:ring-1 focus:ring-brand sm:w-44"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t('crud.processing') : t('settings.categories.add')}
          </button>
        </form>

        <div className="px-4 py-2 sm:px-6">
          {loading ? (
            <div className="space-y-3 py-8">
              <div className="h-10 w-full animate-pulse rounded-lg bg-border" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-border" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              {formatMessage(t('settings.categories.empty'), { suffix })}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((cat) => (
                <li key={cat.id} className="group flex items-center justify-between py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium text-main">{cat.name}</span>
                      {cat.monthly_budget != null && Number(cat.monthly_budget) > 0 && (
                        <span className="text-xs text-muted">
                          {formatMessage(t('settings.categories.limit'), { amount: fmtCurrency(Number(cat.monthly_budget)) })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditBudget(cat)}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted opacity-100 transition-opacity hover:bg-brand/15 hover:text-brand sm:opacity-0 sm:group-hover:opacity-100"
                      title={t('settings.categories.editBudgetTitle')}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id}
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 opacity-100 transition-opacity hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      {deletingId === cat.id ? t('crud.processing') : t('crud.remove')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {categories.length > 0 && (
          <div className="border-t border-border px-4 py-3 sm:px-6">
            <p className="text-xs text-muted">
              {formatMessage(
                categories.length === 1 ? t('settings.categories.countOne') : t('settings.categories.countMany'),
                { count: categories.length },
              )}
            </p>
          </div>
        )}
      </div>

      {editId &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-main">{t('settings.categories.modalTitle')}</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditId(null)
                    setEditBudget(0)
                  }}
                  className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-muted hover:bg-background hover:text-main"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted">
                {formatMessage(t('settings.categories.modalHint'), {
                  name: categories.find((c) => c.id === editId)?.name ?? '',
                })}
              </p>
              <CurrencyInput
                value={editBudget}
                onChange={setEditBudget}
                placeholder="0,00"
                className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-main placeholder-muted focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditId(null)
                    setEditBudget(0)
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-background"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t('crud.save')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
