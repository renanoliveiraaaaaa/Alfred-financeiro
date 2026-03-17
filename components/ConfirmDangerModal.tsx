'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDangerModal({
  open,
  title = 'Atenção, Senhor.',
  description = 'Tem certeza que deseja apagar permanentemente este(s) registro(s)? Esta ação é irreversível e afetará os relatórios.',
  confirmLabel = 'Sim, Excluir',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-backdrop-enter">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 shadow-2xl p-6 space-y-4 animate-modal-enter">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-manor-300 leading-relaxed">{description}</p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Excluindo...</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
