'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useI18n, type Locale } from '@/lib/i18n'
import { formatMessage } from '@/lib/i18nFormat'

export type DailySignup = { dateKey: string; label: string; count: number }

type LatestUser = { id: string; full_name: string | null; created_at: string }

function localeTag(locale: Locale) {
  return locale === 'en' ? 'en-US' : 'pt-BR'
}

function formatShortDay(dateKey: string, locale: Locale) {
  if (!dateKey) return '—'
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return '—'
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat(localeTag(locale), { day: '2-digit', month: 'short' }).format(dt)
}

type Props = {
  dailySignups: DailySignup[]
  latestUsers: LatestUser[]
}

export default function AdminActivitySection({ dailySignups, latestUsers }: Props) {
  const { t, locale } = useI18n()
  const maxCount = Math.max(1, ...dailySignups.map((d) => d.count))

  const formattedUsers = useMemo(
    () =>
      latestUsers.map((u) => {
        const name =
          u.full_name?.trim() ||
          formatMessage(t('admin.activity.anonymousId'), { id: u.id.slice(0, 8) })
        const when = new Intl.DateTimeFormat(localeTag(locale), {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(u.created_at))
        return { ...u, name, when }
      }),
    [latestUsers, locale, t],
  )

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">{t('admin.activity.title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('admin.activity.subtitle')}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-5 lg:col-span-3">
          <h3 className="text-sm font-medium text-slate-700">{t('admin.activity.chartTitle')}</h3>
          <div className="mt-6 flex h-44 items-end gap-1 sm:gap-0.5">
            {dailySignups.map((day) => {
              const hPct = (day.count / maxCount) * 100
              return (
                <div
                  key={day.dateKey}
                  className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                  title={formatMessage(t('admin.activity.chartBar'), { label: day.label, count: day.count })}
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
            <span>{formatShortDay(dailySignups[0]?.dateKey ?? '', locale)}</span>
            <span>{formatShortDay(dailySignups[dailySignups.length - 1]?.dateKey ?? '', locale)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-5 lg:col-span-2">
          <h3 className="text-sm font-medium text-slate-700">{t('admin.activity.latestTitle')}</h3>
          <ul className="mt-4 space-y-3">
            {formattedUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.when}</p>
                </div>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="inline-flex min-h-[44px] shrink-0 items-center text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline sm:min-h-0"
                >
                  {t('admin.activity.viewProfile')}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
