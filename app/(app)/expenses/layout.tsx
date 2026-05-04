import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Despesas' }

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
