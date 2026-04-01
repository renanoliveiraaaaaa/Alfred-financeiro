import Link from 'next/link'

export type DailySignup = { dateKey: string; label: string; count: number }

type LatestUser = { id: string; full_name: string | null; created_at: string }

function formatShortDay(dateKey: string) {
  if (!dateKey) return '—'
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return '—'
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(dt)
}

type Props = {
  dailySignups: DailySignup[]
  latestUsers: LatestUser[]
}

export default function AdminActivitySection({ dailySignups, latestUsers }: Props) {
  const maxCount = Math.max(1, ...dailySignups.map((d) => d.count))

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">Atividade recente</h2>
      <p className="mt-1 text-sm text-slate-500">
        Novos perfis nos últimos 30 dias e os cadastros mais recentes.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 lg:col-span-3">
          <h3 className="text-sm font-medium text-slate-700">Crescimento de utilizadores (30 dias)</h3>
          <div className="mt-6 flex h-44 items-end gap-1 sm:gap-0.5">
            {dailySignups.map((day) => {
              const hPct = (day.count / maxCount) * 100
              return (
                <div
                  key={day.dateKey}
                  className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                  title={`${day.label}: ${day.count}`}
                >
                  <span className="mb-1 text-[10px] font-medium tabular-nums text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 sm:text-xs">
                    {day.count > 0 ? day.count : ''}
                  </span>
                  <div
                    className="w-full max-w-[14px] rounded-t bg-slate-800/85 transition-colors group-hover:bg-slate-700"
                    style={{ height: `${Math.max(hPct, day.count > 0 ? 8 : 2)}%` }}
                    role="presentation"
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-400 sm:text-xs">
            <span>{formatShortDay(dailySignups[0]?.dateKey ?? '')}</span>
            <span>{formatShortDay(dailySignups[dailySignups.length - 1]?.dateKey ?? '')}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 lg:col-span-2">
          <h3 className="text-sm font-medium text-slate-700">5 últimos cadastros</h3>
          <ul className="mt-4 space-y-3">
            {latestUsers.map((u) => {
              const name = u.full_name?.trim() || `ID ${u.id.slice(0, 8)}…`
              const when = new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(u.created_at))
              return (
                <li key={u.id} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500">{when}</p>
                  </div>
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="shrink-0 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                  >
                    Perfil
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
