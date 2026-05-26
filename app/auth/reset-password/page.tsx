import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import ResetPasswordClient from './ResetPasswordClient'

function LoadingFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordClient />
    </Suspense>
  )
}
