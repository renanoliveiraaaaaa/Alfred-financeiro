'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { Loader2, Camera, User } from 'lucide-react'

type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export default function ProfilePage() {
  const supabase = createSupabaseClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState('')

  const [prefWeeklyReport, setPrefWeeklyReport] = useState(false)
  const [prefHideBalance, setPrefHideBalance] = useState(false)

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email
      ? email[0].toUpperCase()
      : '?'

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !userData.user) throw new Error('Sessão expirada.')

      setEmail(userData.user.email ?? '')
      setUserId(userData.user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (profile) {
        setFullName(profile.full_name ?? '')
        setAvatarUrl(profile.avatar_url ?? null)
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar perfil.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadProfile() }, [loadProfile])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploadingAvatar(true)
    setError(null)
    setSuccess(null)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `${userId}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })
      if (uploadErr) throw new Error(`Falha no upload: ${uploadErr.message}`)

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({ id: userId, avatar_url: publicUrl, updated_at: new Date().toISOString() })
      if (upsertErr) throw new Error(upsertErr.message)

      setAvatarUrl(publicUrl)
      setSuccess('Seu retrato foi atualizado com distinção, senhor.')
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar retrato.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
      if (upsertErr) throw new Error(upsertErr.message)

      setSuccess('Preferências salvas com distinção, senhor.')
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar preferências.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-6 w-52 bg-gray-200 dark:bg-manor-800 rounded animate-pulse" />
        <div className="rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 p-8 animate-pulse space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-manor-800" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 bg-gray-200 dark:bg-manor-800 rounded" />
              <div className="h-3 w-28 bg-gray-200 dark:bg-manor-800 rounded" />
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-3 w-24 bg-gray-200 dark:bg-manor-800 rounded mb-2" />
              <div className="h-10 w-full bg-gray-200 dark:bg-manor-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Preferências do senhor</h1>
        <p className="text-sm text-gray-500 dark:text-manor-400 mt-0.5">
          Como posso tornar sua experiência mais agradável hoje?
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      {/* O Retrato */}
      <div className="rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">O Retrato</h2>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="h-24 w-24 rounded-full border-2 border-gold-500/40 overflow-hidden bg-gray-200 dark:bg-manor-800 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-gold-500 dark:text-gold-400">
                  {initials}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {fullName || email.split('@')[0] || 'Senhor'}
            </p>
            <p className="text-xs text-gray-400 dark:text-manor-500 mt-0.5">{email}</p>
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileRef.current?.click()}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gold-600 dark:text-gold-500 hover:text-gold-500 dark:hover:text-gold-400 transition-colors disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              {uploadingAvatar ? 'Atualizando...' : 'Atualizar retrato'}
            </button>
          </div>
        </div>
      </div>

      {/* Informações pessoais */}
      <div className="rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Informações pessoais</h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-manor-400 uppercase tracking-wider mb-1.5">
            Credencial de acesso
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 px-4 py-2.5">
            <User className="h-4 w-4 text-gray-400 dark:text-manor-500 shrink-0" />
            <span className="text-sm text-gray-500 dark:text-manor-400">{email}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400 dark:text-manor-600">O e-mail de acesso não pode ser alterado por aqui.</p>
        </div>

        <div>
          <label htmlFor="fullName" className="block text-xs font-medium text-gray-500 dark:text-manor-400 uppercase tracking-wider mb-1.5">
            Como devo chamá-lo?
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome completo"
            className="block w-full rounded-lg border border-gray-300 dark:border-manor-700 bg-gray-50 dark:bg-manor-950 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-manor-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
          />
        </div>
      </div>

      {/* Preferências do sistema */}
      <div className="rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Preferências do sistema</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Relatórios semanais por e-mail</p>
              <p className="text-xs text-gray-400 dark:text-manor-500 mt-0.5">
                Receba um resumo semanal do patrimônio por pombo-correio eletrônico
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefWeeklyReport}
              onClick={() => setPrefWeeklyReport(!prefWeeklyReport)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                prefWeeklyReport ? 'bg-gold-500' : 'bg-gray-200 dark:bg-manor-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                  prefWeeklyReport ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-manor-800" />

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Ocultar saldo na tela inicial</p>
              <p className="text-xs text-gray-400 dark:text-manor-500 mt-0.5">
                Mantenha discrição sobre o patrimônio ao abrir o sistema
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefHideBalance}
              onClick={() => setPrefHideBalance(!prefHideBalance)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                prefHideBalance ? 'bg-gold-500' : 'bg-gray-200 dark:bg-manor-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                  prefHideBalance ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Botão salvar */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-gold-600 dark:bg-gold-500 px-6 py-2.5 text-sm font-medium text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-manor-950 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            'Salvar preferências'
          )}
        </button>
      </div>
    </div>
  )
}
