import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Cofres' }

export default function GoalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
