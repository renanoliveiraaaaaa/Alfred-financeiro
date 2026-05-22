'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, TrendingUp, Receipt, Target, LayoutDashboard, X } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import {
  fetchOnboardingProgress,
  markWelcomeSeen,
  onboardingComplete,
  type OnboardingStep,
} from '@/lib/onboarding'

type Props = {
  open: boolean
  onClose: () => void
  pronoun?: string
  onComplete?: () => void
}

const TUTORIAL_SLIDES = [
  {
    title: 'Bem-vindo ao Alfred Financeiro',
    body: 'Seu assistente para organizar entradas, saídas, metas e patrimônio em um só lugar — com clareza e discrição.',
    icon: '🎩',
  },
  {
    title: 'Categorias prontas para você',
    body: 'Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Assinaturas e Outros já foram preparadas. Personalize em Cadastros quando quiser.',
    icon: '📂',
  },
  {
    title: 'Lançamento rápido',
    body: 'Use o botão Novo na barra superior para registrar receitas ou despesas em segundos, direto do celular.',
    icon: '⚡',
  },
  {
    title: 'Seu roteiro inicial',
    body: 'Siga os passos abaixo para deixar o painel completo. Você pode retomá-los a qualquer momento no Início.',
    icon: '✓',
  },
] as const

export default function WelcomeModal({ open, onClose, pronoun, onComplete }: Props) {
  const [slide, setSlide] = useState(0)
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [loadingSteps, setLoadingSteps] = useState(true)

  const isLastSlide = slide === TUTORIAL_SLIDES.length - 1
  const totalSlides = TUTORIAL_SLIDES.length

  useEffect(() => {
    if (!open) {
      setSlide(0)
      return
    }
    markWelcomeSeen()

    const load = async () => {
      setLoadingSteps(true)
      const supabase = createSupabaseClient()
      const data = await fetchOnboardingProgress(supabase)
      setSteps(data)
      setLoadingSteps(false)
    }
    load()
  }, [open])

  const handleClose = () => {
    onComplete?.()
    onClose()
  }

  if (!open) return null

  const completedCount = steps.filter((s) => s.done).length
  const current = TUTORIAL_SLIDES[slide]

  const modal = (
    <div
      className="fixed inset-0 z-[999] flex flex-col sm:items-center sm:justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4 py-4 sm:py-0 overflow-y-auto animate-backdrop-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="w-full max-w-md sm:rounded-xl rounded-t-xl border-0 sm:border border-border bg-surface shadow-2xl overflow-hidden animate-modal-enter mt-auto sm:mt-0 max-h-[90vh] sm:max-h-none flex flex-col glass-card">
        {/* Indicador de slides */}
        <div className="flex gap-1.5 px-6 pt-4">
          {TUTORIAL_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i === slide ? 'bg-brand' : i < slide ? 'bg-brand/40' : 'bg-border'
              }`}
              aria-label={`Etapa ${i + 1} de ${totalSlides}`}
            />
          ))}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-brand/15 flex items-center justify-center shrink-0 text-2xl">
                {current.icon}
              </div>
              <div>
                <h2 id="welcome-modal-title" className="text-lg font-semibold text-main">
                  {slide === 0
                    ? `Bem-vindo à Mansão${pronoun ? `, ${pronoun}` : ''}`
                    : current.title}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Passo {slide + 1} de {totalSlides}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-muted leading-relaxed">{current.body}</p>

          {/* Checklist no último slide */}
          {isLastSlide && (
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Checklist de primeiros passos</span>
                {!loadingSteps && (
                  <span>{completedCount}/{steps.length}</span>
                )}
              </div>
              {loadingSteps ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 rounded-lg bg-border animate-pulse" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-2">
                  {steps.map((step) => (
                    <li
                      key={step.key}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          step.done
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-border text-brand'
                        }`}
                      >
                        {step.done ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className={`text-sm flex-1 ${step.done ? 'text-muted line-through' : 'text-main'}`}>
                        {step.label}
                      </span>
                      {!step.done && (
                        <Link
                          href={step.href}
                          onClick={handleClose}
                          className="text-xs font-medium text-brand hover:underline"
                        >
                          Ir
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/revenues/new"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium bg-emerald-600 text-white hover:opacity-90"
                >
                  <TrendingUp className="h-3.5 w-3.5" /> Nova entrada
                </Link>
                <Link
                  href="/expenses/new"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border border-border text-main hover:bg-background"
                >
                  <Receipt className="h-3.5 w-3.5" /> Nova saída
                </Link>
              </div>
            </div>
          )}

          {/* Ícones ilustrativos nos slides intermediários */}
          {slide === 1 && (
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              {['Alimentação', 'Transporte', 'Moradia', 'Saúde'].map((c) => (
                <span key={c} className="rounded-full border border-border px-2.5 py-1 bg-background">
                  {c}
                </span>
              ))}
              <span className="rounded-full border border-border px-2.5 py-1 bg-background">+4</span>
            </div>
          )}
          {slide === 2 && (
            <div className="rounded-lg border border-dashed border-brand/40 bg-brand/5 px-4 py-3 text-xs text-muted">
              Dica: no celular, o campo de valor abre o teclado numérico automaticamente.
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-background border-t border-border shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (slide > 0 ? setSlide(slide - 1) : handleClose())}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-medium text-muted hover:text-main transition-colors touch-manipulation"
          >
            {slide > 0 ? (
              <>
                <ArrowLeft className="h-4 w-4" /> Anterior
              </>
            ) : (
              'Pular'
            )}
          </button>
          {!isLastSlide ? (
            <button
              type="button"
              onClick={() => setSlide(slide + 1)}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 transition-opacity touch-manipulation"
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 transition-opacity touch-manipulation"
            >
              {onboardingComplete(steps) ? (
                <>
                  <LayoutDashboard className="h-4 w-4" /> Começar
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" /> Entendido
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

export { shouldShowWelcomeModal } from '@/lib/onboarding'
