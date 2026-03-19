'use client'

import { useUserPreferences } from '@/lib/userPreferencesContext'

export default function LiquidBackground() {
  const { appTheme } = useUserPreferences()
  if (appTheme !== 'liquid') return null

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-400/10 dark:bg-indigo-500/5 blur-3xl animate-liquid-float-1 top-[-10%] left-[-5%]" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-violet-400/[0.08] dark:bg-violet-500/[0.04] blur-3xl animate-liquid-float-2 bottom-[-5%] right-[-5%]" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-blue-400/[0.06] dark:bg-blue-500/[0.03] blur-3xl animate-liquid-float-3 top-[40%] left-[50%]" />
    </div>
  )
}
