'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const HIDE_FOOTER_PREFIXES = ['/auth/', '/invite/']
const HIDE_FOOTER_EXACT = new Set(['/', '/login', '/expired', '/offline'])

export default function AppFooter() {
  const pathname = usePathname()

  if (HIDE_FOOTER_EXACT.has(pathname) || HIDE_FOOTER_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null
  }

  return (
    <footer className="w-full border-t border-border bg-background px-4 py-6 text-center text-xs text-muted">
      <span>
        © {new Date().getFullYear()} Alfred — Assistente Financeiro. Todos os direitos reservados. —
        <Link href="/privacidade" className="ml-1 underline hover:text-brand">
          Política de Privacidade e Termos de Uso
        </Link>
      </span>
    </footer>
  )
}
