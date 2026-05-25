'use client'

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import MaskedValue from '@/components/MaskedValue'
import { useI18n } from '@/lib/i18n'
import { formatMessage } from '@/lib/i18nFormat'
import type { ChartData, ChartOptions } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

type Props = {
  cardClass: string
  h2Class: string
  hasData: boolean
  hasCategoryData: boolean
  hasYearData: boolean
  categoryTotals: Record<string, number>
  categoryLabels: Record<string, string>
  categoryColors: Record<string, string>
  doughnutData: ChartData<'doughnut'>
  doughnutOptions: ChartOptions<'doughnut'>
  barData: ChartData<'bar'>
  barOptions: ChartOptions<'bar'>
  lineData: ChartData<'line'>
  lineOptions: ChartOptions<'line'>
  year: number
  pronoun: string
}

export default function ReportsChartsSection({
  cardClass,
  h2Class,
  hasData,
  hasCategoryData,
  hasYearData,
  categoryTotals,
  categoryLabels,
  categoryColors,
  doughnutData,
  doughnutOptions,
  barData,
  barOptions,
  lineData,
  lineOptions,
  year,
  pronoun,
}: Props) {
  const { t } = useI18n()

  if (!hasData && !hasYearData) return null

  return (
    <>
      {hasData && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className={`${cardClass} p-6`}>
            <h2 className={`${h2Class} mb-4`}>{t('reports.chart.byCategory')}</h2>
            {!hasCategoryData ? (
              <p className="text-sm text-muted py-12 text-center">{t('reports.chart.noExpenses')}</p>
            ) : (
              <>
                <div className="relative h-64" role="img" aria-label={t('reports.chart.doughnutAria')}>
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
                <ul className="mt-4 space-y-2" aria-label={t('reports.chart.categoryBreakdown')}>
                  {Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).map(([cat, total]) => (
                    <li key={cat} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: categoryColors[cat] ?? '#6b7280' }} />
                        <span className="text-muted">{categoryLabels[cat] ?? cat}</span>
                      </div>
                      <MaskedValue value={total} className="font-medium text-main tabular-nums" />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className={`${cardClass} p-6`}>
            <h2 className={`${h2Class} mb-4`}>{t('reports.chart.inOut')}</h2>
            <div className="relative h-64" role="img" aria-label={t('reports.chart.barAria')}>
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>
      )}

      {hasYearData && (
        <div className={`${cardClass} p-6`}>
          <div className="relative h-80" role="img" aria-label={formatMessage(t('reports.chart.lineAria'), { year })}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>
      )}

      {!hasYearData && hasData && (
        <div className={`${cardClass} p-12 text-center`}>
          <p className="text-muted text-sm">{formatMessage(t('reports.emptyYear'), { year, pronoun })}</p>
        </div>
      )}
    </>
  )
}
