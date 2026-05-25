import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/serverI18n'

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('seo.creditCards')
}

export default function CreditCardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
