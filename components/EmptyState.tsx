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
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-16 text-center transition-colors">
      <div className="h-14 w-14 rounded-2xl bg-border flex items-center justify-center mb-5">
        <Icon className="h-7 w-7 text-muted" />
      </div>
      <h3 className="text-sm font-semibold text-main mb-1">{title}</h3>
      <p className="text-sm text-muted max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
