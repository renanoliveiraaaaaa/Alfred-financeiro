'use client'

import { Sparkles, CreditCard, TrendingUp } from 'lucide-react'
import MaskedValue from '@/components/MaskedValue'
import type { BuyingPowerResult } from '@/lib/lifestyleFinance'
import { useUserPreferences } from '@/lib/userPreferencesContext'

type Props = {
  data: BuyingPowerResult
  monthLabel: string
}

export default function BuyingPowerCard({ data, monthLabel }: Props) {
  const { activeOrgType } = useUserPreferences()
  const isBusiness = activeOrgType === 'business'
  const {
    dinheiroLivre,
    fixedCommitted,
    monthlyInvestCommitment,
    lifestyleSpend,
    lifestyleShareOfFree,
    comfortWarning,
  } = data

  const barPct =
    data.dinheiroLivre > 0 && lifestyleShareOfFree != null
      ? Math.min(100, Math.round(lifestyleShareOfFree * 1000) / 10)
      : data.dinheiroLivre <= 0 && lifestyleSpend > 0
        ? 100
        : 0

  const barColorClass = comfortWarning
    ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
    : 'bg-emerald-500/90'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/90 p-5 shadow-sm ring-1 ring-white/5 backdrop-blur-sm glass-card">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand/10 blur-2xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 text-brand shadow-inner">
              {isBusiness ? <TrendingUp className="h-5 w-5" strokeWidth={1.75} aria-hidden /> : <CreditCard className="h-5 w-5" strokeWidth={1.75} aria-hidden />}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                {isBusiness ? 'Margem operacional' : 'Estilo de vida'}
              </p>
              <h3 className="text-base font-semibold tracking-tight text-main">
                {isBusiness ? 'Margem Operacional Livre' : 'Disponível para Estilo de Vida'}
              </h3>
              <p className="text-xs text-muted mt-0.5">{isBusiness ? 'Base: faturamento − custos fixos − reservas · ' : 'Base: receitas − contas essenciais − metas · '}{monthLabel}</p>
            </div>
          </div>
          <Sparkles className="h-5 w-5 shrink-0 text-amber-400/90 opacity-80" aria-hidden />
        </div>

        <div>
          <p className="text-xs text-muted">Dinheiro livre estimado</p>
          <MaskedValue
            value={dinheiroLivre}
            className={`mt-1 block text-2xl font-semibold tabular-nums tracking-tight ${
              dinheiroLivre >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          />
        </div>

        <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
            <dt className="text-muted">{isBusiness ? 'Custos fixos' : 'Essenciais / contas'}</dt>
            <dd className="font-medium tabular-nums text-main">
              <MaskedValue value={fixedCommitted} />
            </dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
            <dt className="text-muted">{isBusiness ? 'Reservas (mês)' : 'Metas (mês)'}</dt>
            <dd className="font-medium tabular-nums text-main">
              <MaskedValue value={monthlyInvestCommitment} />
            </dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
            <dt className="text-muted">{isBusiness ? 'Variáveis / outros' : 'Lazer + outros'}</dt>
            <dd className="font-medium tabular-nums text-main">
              <MaskedValue value={lifestyleSpend} />
            </dd>
          </div>
        </dl>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{isBusiness ? 'Custos variáveis vs. margem livre' : 'Uso de lazer/outros vs. dinheiro livre'}</span>
            {lifestyleShareOfFree != null && dinheiroLivre > 0 ? (
              <span className="tabular-nums text-main font-medium">{barPct}%</span>
            ) : null}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/80">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColorClass}`}
              style={{ width: `${Math.min(100, barPct)}%` }}
            />
          </div>
          {comfortWarning ? (
            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300/95">
              {isBusiness ? 'Senhor, os custos variáveis estão consumindo a margem operacional prevista.' : 'Senhor, seu limite de conforto para este mês está próximo do fim.'}
            </p>
          ) : (
            <p className="text-xs text-muted">
              {isBusiness ? 'Margem operacional dentro do previsto para o período, Senhor.' : 'Mantém reserva para lazer dentro do que previu para o mês, Senhor.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
