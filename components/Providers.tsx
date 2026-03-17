'use client'

import { ThemeProvider } from 'next-themes'
import { PrivacyProvider } from '@/lib/privacyContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <PrivacyProvider>
        {children}
      </PrivacyProvider>
    </ThemeProvider>
  )
}
