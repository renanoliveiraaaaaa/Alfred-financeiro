'use client'

import { ThemeProvider } from 'next-themes'
import { PrivacyProvider } from '@/lib/privacyContext'
import { ToastProvider } from '@/lib/toastContext'
import { UserPreferencesProvider } from '@/lib/userPreferencesContext'
import ThemeApplier from '@/components/ThemeApplier'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <PrivacyProvider>
        <UserPreferencesProvider>
          <ThemeApplier />
          <ToastProvider>
            {children}
          </ToastProvider>
        </UserPreferencesProvider>
      </PrivacyProvider>
    </ThemeProvider>
  )
}
