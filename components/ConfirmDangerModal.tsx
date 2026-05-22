'use client'

import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useFocusTrap, useEscapeKey } from '@/lib/useFocusTrap'

type Props = {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDangerModal({
  open,
  title,
  description,
  confirmLabel,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, panelRef)
  useEscapeKey(open && !loading, onCancel)

  if (!open) return null

  const modal = (
    <div
      className="fixed inset-0 z-[999] flex flex-col sm:items-center sm:justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4 py-4 sm:py-0 overflow-y-auto animate-backdrop-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="danger-modal-title"
      onClick={(e) => e.target === e.currentTarget && !loading && onCancel()}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-md sm:rounded-xl rounded-t-xl border-0 sm:border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 shadow-2xl p-6 space-y-4 animate-modal-enter mt-auto sm:mt-0 outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden />
          </div>
          <h2 id="danger-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            {title ?? t('modal.danger.title')}
          </h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-manor-300 leading-relaxed">
          {description ?? t('modal.danger.description')}
        </p>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 disabled:opacity-50 transition-colors touch-manipulation"
          >
            {t('modal.danger.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors touch-manipulation"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('modal.danger.loading')}
              </>
            ) : (
              confirmLabel ?? t('modal.danger.confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

export { ConfirmDangerModal }
