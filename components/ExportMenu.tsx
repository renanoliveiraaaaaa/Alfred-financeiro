'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet } from 'lucide-react'
import { downloadCsv, downloadExcel, type ExportSheet } from '@/lib/exportCsv'
import { useI18n } from '@/lib/i18n'

type Props = {
  filename: string
  sheets: ExportSheet[]
  disabled?: boolean
  className?: string
}

export default function ExportMenu({ filename, sheets, disabled = false, className = '' }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const hasData = sheets.some((s) => s.rows.length > 0)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleCsv = () => {
    const primary = sheets.find((s) => s.rows.length > 0)
    if (!primary) return
    downloadCsv(primary.rows, `${filename}.csv`)
    setOpen(false)
  }

  const handleExcel = () => {
    downloadExcel(sheets, filename)
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || !hasData}
        title="Exportar dados"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-main hover:bg-background disabled:opacity-40 transition-colors"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">{t('export.label')}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[160px] rounded-lg border border-border bg-surface shadow-lg py-1 animate-modal-enter"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleCsv}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-main hover:bg-background transition-colors"
          >
            <Download className="h-4 w-4 text-muted" />
            {t('export.csv')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleExcel}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-main hover:bg-background transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-muted" />
            {t('export.excel')}
          </button>
        </div>
      )}
    </div>
  )
}
