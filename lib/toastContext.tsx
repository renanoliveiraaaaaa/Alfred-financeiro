'use client'

import { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, X } from 'lucide-react'

const TOAST_DURATION = 5000

type ToastType = 'error' | 'success'

type ToastState = {
  message: string
  type: ToastType
} | null

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void
  toastError: (message: string) => void
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  toastError: () => {},
})

function ToastElement({
  state,
  onClose,
}: {
  state: { message: string; type: ToastType }
  onClose: () => void
}) {
  const isError = state.type === 'error'
  return (
    <div
      role="alert"
      className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm rounded-xl border shadow-xl animate-fade-in ${
        isError
          ? 'border-red-200 dark:border-red-500/40 bg-white dark:bg-red-950/95'
          : 'border-emerald-200 dark:border-emerald-500/40 bg-white dark:bg-emerald-950/95'
      }`}
      style={{ zIndex: 99999 }}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        {isError ? (
          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        )}
        <p
          className={`flex-1 text-sm font-medium leading-snug ${
            isError ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {state.message}
        </p>
        <button
          onClick={onClose}
          className={`shrink-0 ml-1 -mr-1 -mt-0.5 p-1 rounded-md transition-colors ${
            isError
              ? 'text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50'
              : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
          }`}
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const toast = useCallback((message: string, type: ToastType = 'error') => {
    setState({ message, type })
    setTimeout(() => setState(null), TOAST_DURATION)
  }, [])

  const toastError = useCallback((message: string) => toast(message, 'error'), [toast])

  return (
    <ToastContext.Provider value={{ toast, toastError }}>
      {children}
      {mounted && state &&
        createPortal(
          <ToastElement state={state} onClose={() => setState(null)} />,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

/** Mensagem padrão para erros de conexão/rede */
export const CONNECTION_ERROR_MSG =
  'Houve um problema de comunicação. Por favor, verifique sua conexão e tente novamente.'

export function isConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: string }).message) : String(err))
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('network') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT')
  )
}
