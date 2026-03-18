'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>(null)

  const toast = useCallback((message: string, type: ToastType = 'error') => {
    setState({ message, type })
    setTimeout(() => setState(null), TOAST_DURATION)
  }, [])

  const toastError = useCallback((message: string) => toast(message, 'error'), [toast])

  return (
    <ToastContext.Provider value={{ toast, toastError }}>
      {children}
      {state && (
        <div
          role="alert"
          className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[100] rounded-lg border px-4 py-3 text-sm font-medium shadow-lg animate-fade-in ${
            state.type === 'error'
              ? 'border-red-200 dark:border-red-500/50 bg-red-50 dark:bg-red-950/90 text-red-700 dark:text-red-300'
              : 'border-emerald-200 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {state.message}
        </div>
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
