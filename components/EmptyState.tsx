'use client'

import type { LucideIcon } from 'lucide-react'

type Props = {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

import { useRef, useEffect } from 'react'

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  const actionBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (actionBtnRef.current) {
      actionBtnRef.current.focus()
    }
  }, [actionLabel, onAction])

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-16 text-center transition-colors glass-card animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="h-14 w-14 rounded-2xl bg-border flex items-center justify-center mb-5">
        <Icon className="h-7 w-7 text-muted" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-main mb-1" tabIndex={0} style={{outline: 'none'}}>{title}</h3>
      <p className="text-sm text-muted max-w-xs" tabIndex={0} style={{outline: 'none'}}>{description}</p>
      {actionLabel && onAction && (
        <button
          ref={actionBtnRef}
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand transition-colors"
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
