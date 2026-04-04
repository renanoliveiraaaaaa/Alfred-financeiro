'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="max-w-md space-y-3 rounded-2xl border border-border/80 bg-surface/60 px-6 py-8 shadow-lg backdrop-blur-md glass-card">
        <p className="text-sm leading-relaxed text-main">
          Perdoe-me, Senhor. Houve um contratempo de comunicação com os servidores.
        </p>
        <p className="text-xs text-muted">
          Se o incômodo persistir, recarregue a página ou tente novamente em instantes.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-surface"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
