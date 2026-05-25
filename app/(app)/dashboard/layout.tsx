import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/serverI18n'

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('seo.dashboard')
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
