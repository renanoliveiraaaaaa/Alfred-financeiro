import { Suspense } from 'react'
import HomeClient from '@/components/landing/HomeClient'

function HomeLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400"
        aria-hidden
      />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeClient />
    </Suspense>
  )
}
