import Link from 'next/link'

export default function AppFooter() {
  return (
    <footer className="w-full py-6 px-4 text-center text-xs text-muted border-t border-border bg-background">
      <span>
        © {new Date().getFullYear()} Alfred Financeiro. Todos os direitos reservados. —
        <Link href="/docs/PRIVACIDADE_TERMO_DE_USO.md" target="_blank" className="underline hover:text-brand ml-1">
          Política de Privacidade e Termos de Uso
        </Link>
      </span>
    </footer>
  )
}
