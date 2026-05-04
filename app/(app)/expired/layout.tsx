import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Acesso Expirado' }

export default function ExpiredLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
