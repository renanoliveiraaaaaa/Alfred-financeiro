'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'
import Sidebar from '@/components/Sidebar'
import AnimatedPage from '@/components/AnimatedPage'
import LiquidBackground from '@/components/LiquidBackground'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { useUserPreferences } from '@/lib/userPreferencesContext'

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { loadPreferences } = useUserPreferences()
  const [checking, setChecking] = useState(true)

  const isExpiredPage = pathname === '/expired'

  useEffect(() => {
    const checkTrial = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setChecking(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_status, trial_ends_at')
        .eq('id', user.id)
        .maybeSingle()

      const planStatus = profile?.plan_status ?? 'trial'
      const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null

      const now = new Date()
      const isExpired = planStatus === 'trial' && trialEndsAt && now > trialEndsAt

      if (isExpired && !isExpiredPage) {
        router.replace('/expired')
        return
      }
      if (user) loadPreferences(user.id)
      setChecking(false)
    }

    checkTrial()
  }, [supabase, router, isExpiredPage, loadPreferences])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  if (isExpiredPage) {
    return <>{children}</>
  }

  return (
    <div className="app-layout h-screen flex overflow-hidden transition-colors bg-background glass-background">
        <LiquidBackground />
        <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-60 max-md:ml-16">
        <Topbar />
        <main className="flex-1 min-h-0 overflow-y-auto p-6">
          <AnimatedPage>{children}</AnimatedPage>
        </main>
      </div>
    </div>
  )
}
