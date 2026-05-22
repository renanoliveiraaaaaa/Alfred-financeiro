'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type Props = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export default function Pagination({ page, totalPages, onPageChange, className = '' }: Props) {
  const { t } = useI18n()

  if (totalPages <= 1) return null

  return (
    <nav
      className={`flex items-center justify-between gap-3 pt-4 ${className}`}
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('pagination.prev')}
      </button>
      <span className="text-xs text-muted tabular-nums">
        {t('pagination.page')
          .replace('{current}', String(page))
          .replace('{total}', String(totalPages))}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {t('pagination.next')}
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}

export const PAGE_SIZE = 25
