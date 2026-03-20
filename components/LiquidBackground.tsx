'use client'

import { useUserPreferences } from '@/lib/userPreferencesContext'

/**
 * Camada fixa no z-index mais baixo (z-0): blobs ciano / fúcsia / violeta / rosa
 * com blur-3xl, opacidade ~50% e animação float + pulso — o vidro dos cards revela esse fundo.
 */
export default function LiquidBackground() {
  const { appTheme } = useUserPreferences()
  if (appTheme !== 'liquid') return null

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      <div className="absolute w-[min(92vw,560px)] h-[min(92vw,560px)] rounded-full bg-cyan-400/50 dark:bg-cyan-400/45 blur-3xl animate-liquid-1-pulse top-[-12%] left-[-8%]" />
      <div className="absolute w-[min(85vw,500px)] h-[min(85vw,500px)] rounded-full bg-fuchsia-500/50 dark:bg-fuchsia-500/45 blur-3xl animate-liquid-2-pulse bottom-[-10%] right-[-6%]" />
      <div className="absolute w-[min(75vw,440px)] h-[min(75vw,440px)] rounded-full bg-violet-500/50 dark:bg-violet-400/45 blur-3xl animate-liquid-3-pulse top-[36%] left-[48%] -translate-x-1/2" />
      <div className="absolute w-[min(65vw,400px)] h-[min(65vw,400px)] rounded-full bg-rose-400/50 dark:bg-pink-500/40 blur-3xl animate-liquid-1-pulse-alt top-[58%] left-[6%]" />
      <div className="absolute w-[min(55vw,320px)] h-[min(55vw,320px)] rounded-full bg-sky-400/50 dark:bg-sky-400/40 blur-3xl animate-liquid-2-pulse top-[10%] right-[10%]" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-transparent to-fuchsia-500/20 dark:from-cyan-500/15 dark:to-fuchsia-600/18 mix-blend-soft-light opacity-50 animate-pulse" />
    </div>
  )
}
