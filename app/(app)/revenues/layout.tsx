import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Receitas' }

export default function RevenuesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
