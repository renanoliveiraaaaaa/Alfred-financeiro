'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'
import Sidebar from '@/components/Sidebar'
import AnimatedPage from '@/components/AnimatedPage'
import { createSupabaseClient } from '@/lib/supabaseClient'

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseClient()
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
      setChecking(false)
    }

    checkTrial()
  }, [supabase, router, isExpiredPage])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-manor-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
      </div>
    )
  }

  if (isExpiredPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-manor-950 flex transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 overflow-auto">
          <AnimatedPage>{children}</AnimatedPage>
        </main>
      </div>
    </div>
  )
}
