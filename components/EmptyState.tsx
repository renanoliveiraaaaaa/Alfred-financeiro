'use client'

import type { LucideIcon } from 'lucide-react'

type Props = {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-manor-800 bg-white dark:bg-manor-900 px-6 py-16 text-center transition-colors">
      <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-manor-800 flex items-center justify-center mb-5">
        <Icon className="h-7 w-7 text-gray-300 dark:text-manor-600" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-manor-400 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gold-600 dark:bg-gold-500 text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
