import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import ResetPasswordClient from './ResetPasswordClient'

function LoadingFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
    </div>
  )
}

type Props = {
  searchParams: { error?: string; token_hash?: string; type?: string; code?: string }
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordClient
        initialAuthenticated={!!user}
        urlError={searchParams.error ?? null}
      />
    </Suspense>
  )
}
