import { Sparkles, FileDown } from 'lucide-react'
import type { ButlerInsightData } from '@/lib/butlerInsightServer'

type Props = {
  data: ButlerInsightData
}

export default function ButlerInsight({ data }: Props) {
  const accent =
    data.trend === 'up'
      ? 'from-slate-900 via-slate-800 to-amber-950/90'
      : data.trend === 'down'
        ? 'from-slate-900 via-emerald-950/80 to-slate-800'
        : 'from-slate-900 via-slate-800 to-slate-900'

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-5 shadow-xl ring-1 ring-white/5 sm:p-6`}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-brand/10 blur-2xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-amber-100 shadow-inner">
              <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                {data.context === 'business' ? 'Análise empresarial' : 'Economia doméstica'}
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                Conselho do Alfred
              </h2>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/85 sm:text-[15px]">{data.message}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            disabled
            title="Disponível em breve"
          >
            <FileDown className="h-3.5 w-3.5 opacity-90" aria-hidden />
            Gerar relatório completo (PDF)
          </button>
        </div>
      </div>
    </section>
  )
}
