import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Fontes de Renda' }

export default function IncomeSourcesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
