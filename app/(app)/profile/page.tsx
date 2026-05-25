'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { useUserPreferences, type Gender, type AppTheme } from '@/lib/userPreferencesContext'
import { useGreetingPronoun } from '@/lib/greeting'
import { useTheme } from 'next-themes'
import { useI18n, type Locale } from '@/lib/i18n'
import { formatMessage } from '@/lib/i18nFormat'
import { parseCustomTheme, type CustomTheme } from '@/lib/customTheme'
import { logActivity } from '@/lib/activityLog'
import CustomThemeEditor from '@/components/CustomThemeEditor'
import TwoFactorPanel from '@/components/security/TwoFactorPanel'
import ActivityLogPanel from '@/components/security/ActivityLogPanel'
import { ConfirmDangerModal } from '@/components/ConfirmDangerModal'
import { Loader2, Camera, User, Sun, Moon, Monitor, Droplets } from 'lucide-react'

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
  const [gender, setGender] = useState<Gender | null>(null)
  const [appTheme, setAppTheme] = useState<AppTheme>('normal')

  const { setLocalPreferences, updatePreferences } = useUserPreferences()
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const pronoun = useGreetingPronoun()
  const prefTitleKey = gender === 'M' ? 'profile.prefTitle.m' : gender === 'F' ? 'profile.prefTitle.f' : 'profile.prefTitle.o'

  const [prefWeeklyReport, setPrefWeeklyReport] = useState(false)
  const [prefHideBalance, setPrefHideBalance] = useState(false)
  const [customTheme, setCustomTheme] = useState<CustomTheme | null>(null)
  const [profileLocale, setProfileLocale] = useState<Locale>('pt')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email
      ? email[0].toUpperCase()
      : '?'

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !userData.user) throw new Error(t('profile.error.session'))

      setEmail(userData.user.email ?? '')
      setUserId(userData.user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (profile) {
        const theme = (profile.app_theme as AppTheme) || 'normal'
        setFullName(profile.full_name ?? '')
        setAvatarUrl(profile.avatar_url ?? null)
        setGender((profile.gender as Gender) || null)
        setAppTheme(theme)
        setLocalPreferences({ gender: (profile.gender as Gender) || null, appTheme: theme })
        setPrefHideBalance(profile.hide_balance ?? false)
        setPrefWeeklyReport(profile.weekly_report ?? false)
        setCustomTheme(parseCustomTheme(profile.custom_theme))
        const loc = (profile.locale as Locale) || 'pt'
        setProfileLocale(loc)
        setLocale(loc)
      }
    } catch (err: any) {
      setError(err?.message || t('profile.error.load'))
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
      setSuccess(formatMessage(t('profile.success.avatar'), { pronoun }))
    } catch (err: any) {
      setError(err?.message || t('profile.error.avatar'))
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
          gender,
          app_theme: appTheme,
          hide_balance: prefHideBalance,
          weekly_report: prefWeeklyReport,
          locale: profileLocale,
          custom_theme: customTheme,
          updated_at: new Date().toISOString(),
        })
      if (upsertErr) throw new Error(upsertErr.message)

      setLocalPreferences({ gender, appTheme, customTheme, locale: profileLocale })
      await logActivity(supabase, userId, { action: 'profile_update' })

      setSuccess(formatMessage(t('profile.success.save'), { pronoun }))
    } catch (err: any) {
      setError(err?.message || t('profile.error.save'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      setError(t('profile.error.deleteSupport'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('profile.error.delete'))
    } finally {
      setDeleting(false)
      setDeleteModalOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-6 w-52 bg-border rounded animate-pulse" />
        <div className="rounded-xl border border-border bg-surface p-8 animate-pulse space-y-6 glass-card">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-border" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 bg-border rounded" />
              <div className="h-3 w-28 bg-border rounded" />
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-3 w-24 bg-border rounded mb-2" />
              <div className="h-10 w-full bg-border rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-main">
          {formatMessage(t('profile.title'), { prefTitle: t(prefTitleKey) })}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {t('profile.subtitle')}
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
      <div className="rounded-xl border border-border bg-surface p-6 glass-card">
        <h2 className="text-sm font-semibold text-main mb-4">{t('profile.portrait')}</h2>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="h-24 w-24 rounded-full border-2 border-brand/40 overflow-hidden bg-border flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-brand">
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
            <p className="text-sm font-medium text-main truncate">
              {fullName || email.split('@')[0] || t('profile.fallbackName')}
            </p>
            <p className="text-xs text-muted mt-0.5">{email}</p>
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileRef.current?.click()}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:opacity-80 transition-colors disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              {uploadingAvatar ? t('profile.updatingAvatar') : t('profile.updateAvatar')}
            </button>
          </div>
        </div>
      </div>

      {/* Informações pessoais */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-5 glass-card">
        <h2 className="text-sm font-semibold text-main">{t('profile.personalInfo')}</h2>

        <div>
          <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
            {t('profile.emailLabel')}
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5">
            <User className="h-4 w-4 text-muted shrink-0" />
            <span className="text-sm text-muted">{email}</span>
          </div>
          <p className="mt-1 text-xs text-muted">{t('profile.emailHint')}</p>
        </div>

        <div>
          <label htmlFor="fullName" className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
            {t('profile.fullNameLabel')}
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('profile.fullNamePlaceholder')}
            className="block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
          />
        </div>
      </div>

      {/* Preferências do sistema */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-5 glass-card">
        <h2 className="text-sm font-semibold text-main">{t('profile.systemPrefs')}</h2>

        <div className="space-y-5">
          <div>
            <label htmlFor="gender" className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
              {t('profile.gender')}
            </label>
            <select
              id="gender"
              value={gender ?? ''}
              onChange={(e) => setGender((e.target.value || null) as Gender | null)}
              className="block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            >
              <option value="">{t('profile.genderSelect')}</option>
              <option value="M">{t('profile.gender.m')}</option>
              <option value="F">{t('profile.gender.f')}</option>
              <option value="O">{t('profile.gender.o')}</option>
            </select>
          </div>

          <div className="border-t border-border" />

          {/* Dark Mode: Claro / Escuro / Sistema */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-main">{t('profile.darkMode.title')}</p>
              <p className="text-xs text-muted mt-0.5">
                {t('profile.darkMode.desc')}
              </p>
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {[
                { value: 'light' as const, labelKey: 'profile.darkMode.light', Icon: Sun },
                { value: 'dark' as const, labelKey: 'profile.darkMode.dark', Icon: Moon },
                { value: 'system' as const, labelKey: 'profile.darkMode.system', Icon: Monitor },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    document.documentElement.classList.add('theme-transition')
                    setTheme(opt.value)
                    setTimeout(() => document.documentElement.classList.remove('theme-transition'), 500)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                    (theme ?? 'system') === opt.value
                      ? 'bg-brand text-white'
                      : 'bg-surface text-muted hover:text-main hover:bg-background'
                  }`}
                >
                  <opt.Icon className="h-3.5 w-3.5" />
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Aparência e Temas */}
          <div>
            <p className="text-sm font-medium text-main mb-1">{t('profile.appearance.title')}</p>
            <p className="text-xs text-muted mb-3">
              {t('profile.appearance.desc')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { value: 'normal' as const, labelKey: 'profile.theme.normal', colors: ['#2563eb', '#f8fafc', '#0f172a'] },
                { value: 'gala' as const, labelKey: 'profile.theme.gala', colors: ['#ca8a04', '#fafafa', '#18181b'] },
                { value: 'classic' as const, labelKey: 'profile.theme.classic', colors: ['#b45309', '#fafaf9', '#1c1917'] },
                { value: 'club' as const, labelKey: 'profile.theme.club', colors: ['#065f46', '#f8fafc', '#0f172a'] },
                { value: 'liquid' as const, labelKey: 'profile.theme.liquid', colors: ['#6366f1', '#f0f4f8', '#0a0a1a'] },
              ].map((themeOpt) => (
                <button
                  key={themeOpt.value}
                  type="button"
                  onClick={async () => {
                    const prev = appTheme
                    setAppTheme(themeOpt.value)
                    try {
                      await updatePreferences({ appTheme: themeOpt.value })
                    } catch {
                      setAppTheme(prev)
                    }
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left w-full ${
                    appTheme === themeOpt.value
                      ? 'border-brand bg-brand/5 ring-2 ring-brand/20'
                      : 'border-border hover:border-muted hover:bg-background'
                  }`}
                >
                  <div className="flex gap-1 w-full justify-center">
                    {themeOpt.value === 'liquid' ? (
                      <div className="flex items-center gap-1">
                        <Droplets className="h-5 w-5 text-indigo-500" />
                        {themeOpt.colors.map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    ) : (
                      themeOpt.colors.map((c, i) => (
                        <div key={i} className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: c }} />
                      ))
                    )}
                  </div>
                  <span className="text-xs font-medium text-main text-center leading-tight">{t(themeOpt.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          <div>
            <label htmlFor="locale" className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
              {t('profile.locale')}
            </label>
            <select
              id="locale"
              value={profileLocale}
              onChange={(e) => {
                const next = e.target.value as Locale
                setProfileLocale(next)
                setLocale(next)
              }}
              className="block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-main focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            >
              <option value="pt">{t('profile.locale.pt')}</option>
              <option value="en">{t('profile.locale.en')}</option>
            </select>
          </div>

          <div className="border-t border-border" />

          <CustomThemeEditor
            value={customTheme}
            onChange={(next) => {
              setCustomTheme(next)
              setLocalPreferences({ customTheme: next })
            }}
          />

          <div className="border-t border-border" />

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-main">{t('profile.weeklyReport.title')}</p>
              <p className="text-xs text-muted mt-0.5">
                {t('profile.weeklyReport.desc')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefWeeklyReport}
              onClick={() => setPrefWeeklyReport(!prefWeeklyReport)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                prefWeeklyReport ? 'bg-brand' : 'bg-border'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-surface shadow ring-0 transition-transform duration-200 ${
                  prefWeeklyReport ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-main">{t('profile.hideBalance.title')}</p>
              <p className="text-xs text-muted mt-0.5">
                {t('profile.hideBalance.desc')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefHideBalance}
              onClick={() => setPrefHideBalance(!prefHideBalance)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                prefHideBalance ? 'bg-brand' : 'bg-border'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-surface shadow ring-0 transition-transform duration-200 ${
                  prefHideBalance ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-6 glass-card">
        <h2 className="text-sm font-semibold text-main">{t('profile.security')}</h2>
        {userId && <TwoFactorPanel userId={userId} />}
        <div className="border-t border-border pt-6">
          {userId && <ActivityLogPanel userId={userId} />}
        </div>
      </div>

      {/* Botão salvar */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('crud.processing')}
            </>
          ) : (
            t('profile.save')
          )}
        </button>
      </div>
      {/* Exclusão de conta */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 glass-card mt-8">
        <h2 className="text-sm font-semibold text-red-700 mb-2">{t('profile.delete.title')}</h2>
        <p className="text-xs text-red-700 mb-4">{t('profile.delete.desc')}</p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50 disabled:opacity-50 transition-colors"
          onClick={() => setDeleteModalOpen(true)}
          disabled={deleting}
          aria-label={t('profile.delete.button')}
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t('profile.delete.button')}
        </button>
      </div>

      <ConfirmDangerModal
        open={deleteModalOpen}
        title={t('profile.delete.modalTitle')}
        description={t('profile.delete.modalDesc')}
        confirmLabel={deleting ? t('profile.delete.deleting') : t('profile.delete.confirm')}
        loading={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  )
}
