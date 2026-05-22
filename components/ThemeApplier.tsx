'use client'

import { useEffect } from 'react'
import { useUserPreferences } from '@/lib/userPreferencesContext'
import { applyCustomTheme, clearCustomTheme } from '@/lib/customTheme'

const THEME_CLASSES = ['theme-gala', 'theme-classic', 'theme-club', 'theme-liquid'] as const

export default function ThemeApplier() {
  const { appTheme, customTheme } = useUserPreferences()

  useEffect(() => {
    const html = document.documentElement
    THEME_CLASSES.forEach((c) => html.classList.remove(c))
    if (appTheme !== 'normal') {
      html.classList.add(`theme-${appTheme}`)
    }
  }, [appTheme])

  useEffect(() => {
    if (customTheme) applyCustomTheme(customTheme)
    else clearCustomTheme()
  }, [customTheme])

  return null
}
