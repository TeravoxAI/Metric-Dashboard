import { useMemo } from 'react'
import { DollarSign, Zap, Clock, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { SectionTitle } from '@/components/SectionTitle'
import { CostOverTime } from '@/components/charts/CostOverTime'
import { useLessonPlanStats } from '@/hooks/useMetrics'
import { formatCost, formatNumber } from '@/lib/utils'

export function LLMSection() {
  const { data, isLoading } = useLessonPlanStats()

  const stats = useMemo(() => {
    if (!data) return null
    let totalCost = 0, totalTokens = 0, totalInput = 0, totalOutput = 0, totalTime = 0, count = 0
    for (const row of data) {
      const m = row.metadata ?? {}
      totalCost += m.cost ?? 0
      totalTokens += m.total_tokens ?? 0
      totalInput += m.input_tokens ?? 0
      totalOutput += m.output_tokens ?? 0
      totalTime += m.generation_time ?? 0
      count++
    }
    return {
      totalCost,
      avgCost: count ? totalCost / count : 0,
      totalTokens,
      avgTime: count ? totalTime / count : 0,
    }
  }, [data])

  const loading = isLoading || !stats

  return (
    <section>
      <SectionTitle>LLM / Cost Metrics</SectionTitle>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard
          title="Total Cost"
          value={loading ? '…' : formatCost(stats.totalCost)}
          sub="all time"
          icon={DollarSign}
        />
        <StatCard
          title="Avg Cost / Plan"
          value={loading ? '…' : formatCost(stats.avgCost)}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Tokens"
          value={loading ? '…' : formatNumber(stats.totalTokens)}
          sub="all time"
          icon={Zap}
        />
        <StatCard
          title="Avg Gen Time"
          value={loading ? '…' : `${stats.avgTime.toFixed(1)}s`}
          icon={Clock}
        />
      </div>
      <CostOverTime />
    </section>
  )
}
