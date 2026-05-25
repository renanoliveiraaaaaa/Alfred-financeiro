'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#0f0f0f] text-[#f5f5f5] flex items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-lg font-semibold">Algo deu errado</h1>
          <p className="text-sm text-neutral-400">
            Registramos o incidente. Recarregue a página ou tente novamente em instantes.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex rounded-lg bg-[#b59410] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
