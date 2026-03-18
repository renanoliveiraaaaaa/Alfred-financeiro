'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { TrendingUp, Receipt, X } from 'lucide-react'

const STORAGE_KEY = 'alfred_welcome_seen'

type Props = {
  open: boolean
  onClose: () => void
  pronoun?: string
}

export default function WelcomeModal({ open, onClose, pronoun = 'senhor' }: Props) {
  useEffect(() => {
    if (open) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true')
      } catch {
        // localStorage pode estar indisponível
      }
    }
  }, [open])

  if (!open) return null

  const modal = (
    <div className="fixed inset-0 z-[999] flex flex-col sm:items-center sm:justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4 py-4 sm:py-0 overflow-y-auto animate-backdrop-enter">
      <div className="w-full max-w-md sm:rounded-xl rounded-t-xl border-0 sm:border border-border bg-surface shadow-2xl overflow-hidden animate-modal-enter mt-auto sm:mt-0 max-h-[90vh] sm:max-h-none flex flex-col">
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
                <span className="text-2xl">🎩</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-main">
                  Bem-vindo à Mansão{pronoun ? `, ${pronoun}` : ''}
                </h2>
                <p className="text-sm text-muted mt-0.5">
                  À sua disposição
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-muted leading-relaxed">
            Preparei um conjunto de categorias básicas para organizar suas finanças: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Assinaturas e Outros. Você pode personalizá-las em <strong>Cadastros</strong> quando desejar.
          </p>

          <p className="text-sm text-muted leading-relaxed">
            Permita-me sugerir que registre sua primeira <strong>receita</strong> ou <strong>despesa</strong> para começar a acompanhar o seu patrimônio.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/revenues/new"
              onClick={onClose}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors touch-manipulation"
            >
              <TrendingUp className="h-4 w-4" />
              Registrar receita
            </Link>
            <Link
              href="/expenses/new"
              onClick={onClose}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border border-border text-main hover:bg-background transition-colors touch-manipulation"
            >
              <Receipt className="h-4 w-4" />
              Registrar despesa
            </Link>
          </div>
        </div>

        <div className="px-6 py-3 bg-background border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="w-full min-h-[44px] text-sm font-medium text-brand hover:opacity-80 transition-colors touch-manipulation"
          >
            Entendido, obrigado
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

export function shouldShowWelcomeModal(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'true'
  } catch {
    return true
  }
}
