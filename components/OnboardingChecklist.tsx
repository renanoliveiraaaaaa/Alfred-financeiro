'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, ChevronUp, ListChecks, X } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import {
  dismissChecklist,
  fetchOnboardingProgress,
  isChecklistDismissed,
  onboardingComplete,
  type OnboardingStep,
} from '@/lib/onboarding'

type Props = {
  /** Incrementar para forçar recarga (ex.: após fechar WelcomeModal) */
  refreshKey?: number
}

export default function OnboardingChecklist({ refreshKey = 0 }: Props) {
  const supabase = createSupabaseClient()
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setDismissed(isChecklistDismissed())
    const data = await fetchOnboardingProgress(supabase)
    setSteps(data)
    if (onboardingComplete(data)) {
      dismissChecklist()
      setDismissed(true)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  if (loading || dismissed || onboardingComplete(steps)) return null

  const completed = steps.filter((s) => s.done).length
  const total = steps.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 dark:bg-brand/10 overflow-hidden glass-card">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-brand/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
            <ListChecks className="h-4 w-4 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-main">Primeiros passos</p>
            <p className="text-xs text-muted truncate">
              {completed} de {total} concluídos · {pct}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-2 rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expandir checklist' : 'Recolher checklist'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              dismissChecklist()
              setDismissed(true)
            }}
            className="p-2 rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
            aria-label="Ocultar checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="px-4 pt-3">
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <ul className="p-4 space-y-2">
            {steps.map((step, idx) => (
              <li
                key={step.key}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  step.done
                    ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5'
                    : 'border-border bg-surface'
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2 ${
                    step.done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-border text-brand bg-background'
                  }`}
                >
                  {step.done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.done ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-main'}`}>
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="text-xs text-muted mt-0.5">{step.description}</p>
                  )}
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className="shrink-0 self-center rounded-lg px-2.5 py-1.5 text-xs font-medium bg-brand text-white hover:opacity-90 transition-opacity min-h-[36px] inline-flex items-center"
                  >
                    Ir
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
