'use client'

import { useEffect } from 'react'
import { useUserPreferences } from '@/lib/userPreferencesContext'

const THEME_CLASSES = ['theme-gala', 'theme-classic', 'theme-club', 'theme-liquid'] as const

/**
 * Aplica a classe de tema no html conforme app_theme do perfil.
 * Tema Padrão: :root (normal) - sem classe extra
 * Temas Premium: theme-gala | theme-classic | theme-club | theme-liquid
 */
export default function ThemeApplier() {
  const { appTheme } = useUserPreferences()

  useEffect(() => {
    const html = document.documentElement
    THEME_CLASSES.forEach((c) => html.classList.remove(c))
    if (appTheme !== 'normal') {
      html.classList.add(`theme-${appTheme}`)
    }
  }, [appTheme])

  return null
}
