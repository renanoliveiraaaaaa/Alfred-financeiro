'use client'

import { ThemeProvider } from 'next-themes'
import { PrivacyProvider } from '@/lib/privacyContext'
import { ToastProvider } from '@/lib/toastContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <PrivacyProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </PrivacyProvider>
    </ThemeProvider>
  )
}
