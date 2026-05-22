'use client'

import { ThemeProvider } from 'next-themes'
import { PrivacyProvider } from '@/lib/privacyContext'
import { ToastProvider } from '@/lib/toastContext'
import { UserPreferencesProvider } from '@/lib/userPreferencesContext'
import ThemeApplier from '@/components/ThemeApplier'
import I18nProvider from '@/lib/I18nProvider'
import PwaRegister from '@/components/PwaRegister'
import InstallPrompt from '@/components/InstallPrompt'
import SkipLink from '@/components/SkipLink'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <PrivacyProvider>
        <UserPreferencesProvider>
          <ThemeApplier />
          <I18nProvider>
            <SkipLink />
            <PwaRegister />
            <ToastProvider>
              {children}
              <InstallPrompt />
            </ToastProvider>
          </I18nProvider>
        </UserPreferencesProvider>
      </PrivacyProvider>
    </ThemeProvider>
  )
}
