'use client'

import { useEffect } from 'react'
import { useUserPreferences } from '@/lib/userPreferencesContext'

/**
 * Adiciona ou remove a classe theme-alfred no html conforme app_theme do perfil.
 * Tema Padrão: :root (Confiança Institucional)
 * Tema Alfred: .theme-alfred (paleta luxuosa)
 */
export default function ThemeApplier() {
  const { appTheme } = useUserPreferences()

  useEffect(() => {
    const html = document.documentElement
    if (appTheme === 'alfred') {
      html.classList.add('theme-alfred')
    } else {
      html.classList.remove('theme-alfred')
    }
  }, [appTheme])

  return null
}
