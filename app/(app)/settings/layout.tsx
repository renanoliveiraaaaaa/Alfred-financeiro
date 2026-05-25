import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/serverI18n'

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('seo.settings')
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
