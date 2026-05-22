'use client'

import { useEffect, useState } from 'react'
import { Loader2, History } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { useI18n } from '@/lib/i18n'
import { ACTIVITY_LABELS, fetchRecentActivity, type ActivityLogRow } from '@/lib/activityLog'

type Props = {
  userId: string
}

export default function ActivityLogPanel({ userId }: Props) {
  const { t, locale } = useI18n()
  const supabase = createSupabaseClient()
  const [rows, setRows] = useState<ActivityLogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity(supabase, userId).then((data) => {
      setRows(data)
      setLoading(false)
    })
  }, [supabase, userId])

  const labelFor = (action: string) => {
    const entry = ACTIVITY_LABELS[action as keyof typeof ACTIVITY_LABELS]
    if (!entry) return action
    return locale === 'en' ? entry.en : entry.pt
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-muted" aria-hidden />
        <div>
          <p className="text-sm font-medium text-main">{t('security.activity.title')}</p>
          <p className="text-xs text-muted">{t('security.activity.desc')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> …
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted py-2">{t('security.activity.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" role="table">
            <caption className="sr-only">{t('security.activity.title')}</caption>
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted">
                  {t('security.activity.when')}
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted">
                  {t('security.activity.action')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-xs text-muted tabular-nums whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR')}
                  </td>
                  <td className="px-3 py-2 text-main">{labelFor(row.action)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
