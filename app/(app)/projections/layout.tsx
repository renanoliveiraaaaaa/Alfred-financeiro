import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Orçamento' }

export default function ProjectionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
