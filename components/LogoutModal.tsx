'use client'

import { Loader2, DoorOpen } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import ModalShell from '@/components/ModalShell'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loggingOut?: boolean
  displayName?: string
  variant?: 'desktop' | 'mobile'
}

export default function LogoutModal({
  open,
  onClose,
  onConfirm,
  loggingOut = false,
  displayName = '',
  variant = 'desktop',
}: Props) {
  const { t } = useI18n()
  const name = displayName || (variant === 'desktop' ? 'patrão' : '')

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      closeOnBackdrop={!loggingOut}
      closeOnEscape={!loggingOut}
      titleId="logout-modal-title"
      backdropClassName={
        variant === 'mobile'
          ? 'fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0'
          : 'fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-backdrop-enter'
      }
      panelClassName={
        variant === 'mobile'
          ? 'w-full max-w-sm rounded-2xl border border-border bg-surface shadow-2xl p-6 space-y-4 outline-none'
          : 'w-full max-w-sm rounded-xl border border-border bg-surface shadow-2xl p-6 space-y-4 animate-modal-enter outline-none'
      }
    >
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
          <DoorOpen className="h-5 w-5 text-brand" />
        </div>
        <div>
          <h2 id="logout-modal-title" className="text-base font-semibold text-main">
            {variant === 'mobile' ? t('logout.titleMobile') : t('logout.title')}
          </h2>
          <p className="text-xs text-muted mt-0.5">{t('logout.subtitle')}</p>
        </div>
      </div>

      {variant === 'desktop' && (
        <p className="text-sm text-muted leading-relaxed">
          {t('logout.body').replace('{name}', name)}
        </p>
      )}

      <div className={`flex gap-2 pt-1 ${variant === 'mobile' ? '' : 'justify-end'}`}>
        <button
          onClick={onClose}
          disabled={loggingOut}
          className={`${variant === 'mobile' ? 'flex-1' : ''} px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background disabled:opacity-50 transition-colors min-h-[44px]`}
        >
          {variant === 'desktop' ? t('logout.stay') : t('logout.cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={loggingOut}
          className={`${variant === 'mobile' ? 'flex-1' : ''} inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors min-h-[44px]`}
        >
          {loggingOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('logout.leaving')}
            </>
          ) : (
            t('logout.confirm')
          )}
        </button>
      </div>
    </ModalShell>
  )
}
