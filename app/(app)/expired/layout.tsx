import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/serverI18n'

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('seo.expired')
}

export default function ExpiredLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
