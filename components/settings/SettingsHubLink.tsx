'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'

type Props = {
  href: string
  title: string
  description: string
  Icon: LucideIcon
}

export default function SettingsHubLink({ href, title, description, Icon }: Props) {
  return (
    <Link
      href={href}
      className="flex min-h-[44px] items-center gap-4 rounded-xl border border-border bg-surface px-4 py-4 shadow-sm transition-colors hover:bg-background glass-card"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-main">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
    </Link>
  )
}
