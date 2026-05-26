'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { persistActiveOrganizationId } from '@/lib/activeOrganizationClient'
import { acceptOrganizationInvite } from '@/lib/actions/org-team'
import { useI18n } from '@/lib/i18n'
import { resolveServerError } from '@/lib/serverErrorI18n'

type Props = {
  token: string
}

export default function InviteAcceptClient({ token }: Props) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { t } = useI18n()
  const [status, setStatus] = useState<'loading' | 'needsAuth' | 'error' | 'success'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const { data: auth } = await supabase.auth.getUser()
      if (cancelled) return

      if (!auth.user) {
        setStatus('needsAuth')
        return
      }

      const res = await acceptOrganizationInvite(token)
      if (cancelled) return

      if (!res.ok) {
        setErrorMsg(resolveServerError(res.error, t))
        setStatus('error')
        return
      }

      persistActiveOrganizationId(res.organizationId)
      setStatus('success')
      router.replace('/dashboard')
    }

    run()
    return () => {
      cancelled = true
    }
  }, [supabase, token, t, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <p>{t('org.invite.accepting')}</p>
      </div>
    )
  }

  if (status === 'needsAuth') {
    const returnTo = encodeURIComponent(`/invite/${token}`)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold text-main">{t('org.invite.loginTitle')}</h1>
        <p className="text-sm text-muted max-w-md">{t('org.invite.loginBody')}</p>
        <Link
          href={`/?redirect=${returnTo}`}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          {t('org.invite.loginCta')}
        </Link>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold text-main">{t('org.invite.errorTitle')}</h1>
        <p className="text-sm text-red-600 dark:text-red-400 max-w-md">{errorMsg}</p>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          {t('org.invite.backDashboard')}
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      <p>{t('org.invite.redirecting')}</p>
    </div>
  )
}
