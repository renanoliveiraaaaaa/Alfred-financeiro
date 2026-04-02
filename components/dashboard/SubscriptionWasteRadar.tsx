'use client'

import Link from 'next/link'
import { ScanSearch } from 'lucide-react'
import type { SubscriptionAuditAlert } from '@/lib/lifestyleFinance'

type Props = {
  alerts: SubscriptionAuditAlert[]
}

export default function SubscriptionWasteRadar({ alerts }: Props) {
  if (alerts.length === 0) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/90 p-5 shadow-sm ring-1 ring-white/5 backdrop-blur-sm glass-card">
      <div className="pointer-events-none absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl" />
      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 text-amber-600 dark:text-amber-400 shadow-inner">
            <ScanSearch className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Auditoria
            </p>
            <h3 className="text-base font-semibold tracking-tight text-main">Radar de Desperdício</h3>
            <p className="text-xs text-muted mt-0.5">Assinaturas · últimos 3 meses</p>
          </div>
        </div>

        <ul className="space-y-3">
          {alerts.map((a, i) => (
            <li
              key={`${a.kind}-${a.subscriptionName}-${i}`}
              className={`rounded-xl border px-3.5 py-3 text-sm leading-relaxed ${
                a.kind === 'inflation'
                  ? 'border-amber-200/80 bg-amber-50/50 dark:border-amber-500/25 dark:bg-amber-500/10 text-main'
                  : 'border-border bg-background/50 text-main'
              }`}
            >
              {a.message}
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted">
          <Link href="/subscriptions" className="text-brand font-medium hover:opacity-80 transition-opacity">
            Rever assinaturas
          </Link>
          {' · '}
          <Link href="/expenses" className="text-brand font-medium hover:opacity-80 transition-opacity">
            Lançamentos
          </Link>
        </p>
      </div>
    </div>
  )
}
