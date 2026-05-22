'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  LayoutDashboard,
  RotateCcw,
  X,
} from 'lucide-react'
import ModalShell from '@/components/ModalShell'
import { useI18n } from '@/lib/i18n'
import {
  getDashboardSectionMeta,
  moveSection,
  resetDashboardLayout,
  saveDashboardLayout,
  toggleSectionVisibility,
  type DashboardSectionConfig,
  type DashboardSectionId,
} from '@/lib/dashboardLayout'

type Props = {
  open: boolean
  onClose: () => void
  layout: DashboardSectionConfig[]
  onChange: (layout: DashboardSectionConfig[]) => void
  userId?: string
}

export default function DashboardCustomizeModal({
  open,
  onClose,
  layout,
  onChange,
  userId,
}: Props) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(layout)
  const sectionMeta = useMemo(() => getDashboardSectionMeta(t), [t])

  useEffect(() => {
    if (open) setDraft(layout)
  }, [open, layout])

  const handleSave = () => {
    saveDashboardLayout(draft, userId)
    onChange(draft)
    onClose()
  }

  const handleReset = () => {
    const reset = resetDashboardLayout(userId)
    setDraft(reset)
    onChange(reset)
  }

  const toggle = (id: DashboardSectionId) => {
    setDraft((prev) => toggleSectionVisibility(prev, id))
  }

  const move = (id: DashboardSectionId, direction: 'up' | 'down') => {
    setDraft((prev) => moveSection(prev, id, direction))
  }

  if (!open) return null

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="dashboard-customize-title"
      backdropClassName="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-backdrop-enter"
      panelClassName="w-full max-w-md sm:rounded-xl rounded-t-xl border-0 sm:border border-border bg-surface shadow-2xl max-h-[90vh] flex flex-col animate-modal-enter glass-card outline-none"
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
            <LayoutDashboard className="h-5 w-5 text-brand" />
          </div>
          <div className="min-w-0">
            <h2 id="dashboard-customize-title" className="text-base font-semibold text-main">
              {t('dashboard.customize.title')}
            </h2>
            <p className="text-xs text-muted mt-0.5">{t('dashboard.customize.desc')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-muted hover:text-main hover:bg-background transition-colors min-h-[44px] min-w-[44px]"
          aria-label={t('common.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <ul className="overflow-y-auto flex-1 p-4 space-y-2">
        {draft.map((section, idx) => {
          const meta = sectionMeta[section.id]
          return (
            <li
              key={section.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                section.visible
                  ? 'border-border bg-background'
                  : 'border-border/60 bg-background/50 opacity-70'
              }`}
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => move(section.id, 'up')}
                  disabled={idx === 0}
                  className="p-1 rounded text-muted hover:text-main hover:bg-surface disabled:opacity-30 transition-colors min-h-[36px] min-w-[36px]"
                  aria-label={t('dashboard.customize.moveUp').replace('{label}', meta.label)}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(section.id, 'down')}
                  disabled={idx === draft.length - 1}
                  className="p-1 rounded text-muted hover:text-main hover:bg-surface disabled:opacity-30 transition-colors min-h-[36px] min-w-[36px]"
                  aria-label={t('dashboard.customize.moveDown').replace('{label}', meta.label)}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-main truncate">{meta.label}</p>
                <p className="text-xs text-muted truncate">{meta.description}</p>
              </div>

              <button
                type="button"
                onClick={() => toggle(section.id)}
                className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                  section.visible
                    ? 'bg-brand/10 text-brand hover:bg-brand/20'
                    : 'bg-border text-muted hover:text-main'
                }`}
                aria-pressed={section.visible}
              >
                {section.visible ? (
                  <>
                    <Eye className="h-3.5 w-3.5" /> {t('dashboard.customize.visible')}
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" /> {t('dashboard.customize.hidden')}
                  </>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="px-5 py-4 border-t border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-main transition-colors min-h-[44px]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('dashboard.customize.reset')}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-main hover:bg-background transition-colors min-h-[44px]"
          >
            {t('dashboard.customize.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity min-h-[44px]"
          >
            {t('dashboard.customize.save')}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

export { DEFAULT_DASHBOARD_LAYOUT } from '@/lib/dashboardLayout'
