import DashboardPageClient from './DashboardPageClient'
import ButlerInsight from '@/components/dashboard/ButlerInsight'
import { getButlerInsightData } from '@/lib/butlerInsightServer'

export default async function DashboardPage() {
  const insight = await getButlerInsightData()

  return (
    <DashboardPageClient>
      {insight ? <ButlerInsight data={insight} /> : null}
    </DashboardPageClient>
  )
}
