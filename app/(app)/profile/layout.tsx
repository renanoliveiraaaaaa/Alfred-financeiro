import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/serverI18n'

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('seo.profile')
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
