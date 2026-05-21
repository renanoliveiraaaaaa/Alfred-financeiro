'use client'

import { ThemeProvider } from 'next-themes'
import { PrivacyProvider } from '@/lib/privacyContext'
import { ToastProvider } from '@/lib/toastContext'
import { UserPreferencesProvider } from '@/lib/userPreferencesContext'
import ThemeApplier from '@/components/ThemeApplier'
import I18nProvider from '@/lib/I18nProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <PrivacyProvider>
        <UserPreferencesProvider>
          <ThemeApplier />
          <I18nProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </I18nProvider>
        </UserPreferencesProvider>
      </PrivacyProvider>
    </ThemeProvider>
  )
}
