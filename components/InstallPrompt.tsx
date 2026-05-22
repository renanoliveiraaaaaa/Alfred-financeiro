'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'alfred_pwa_install_dismissed'

export default function InstallPrompt() {
  const { t } = useI18n()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (localStorage.getItem(DISMISS_KEY) === 'true') return
    } catch {
      /* ignore */
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, 'true')
    } catch {
      /* ignore */
    }
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setVisible(false)
    setDeferred(null)
  }

  if (!visible || !deferred) return null

  return (
    <div
      role="region"
      aria-label={t('pwa.install')}
      className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[90] rounded-xl border border-border bg-surface shadow-xl p-4 glass-card animate-modal-enter"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-main">{t('pwa.install')}</p>
          <p className="text-xs text-muted mt-0.5">{t('pwa.installDesc')}</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={install}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              {t('pwa.install')}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-main"
            >
              {t('dashboard.customize.cancel')}
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="p-1 text-muted hover:text-main" aria-label={t('toast.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
