'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ArrowLeft } from 'lucide-react'

const nav = [
  { href: '/admin/dashboard', label: 'Visão geral', Icon: LayoutDashboard },
  { href: '/admin/users', label: 'Gestão de clientes', Icon: Users },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 lg:w-60">
      <div className="border-b border-slate-800 px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Painel</p>
        <p className="mt-1 text-sm font-semibold text-slate-50">Administração</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {nav.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Voltar ao app
        </Link>
      </div>
    </aside>
  )
}
