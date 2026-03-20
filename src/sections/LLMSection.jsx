import { useMemo } from 'react'
import { DollarSign, Zap, Clock, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { SectionTitle } from '@/components/SectionTitle'
import { BreakdownBar } from '@/components/charts/BreakdownBar'
import { useLessonPlanStats } from '@/hooks/useMetrics'
import { formatCost, formatNumber } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

function groupByMonth(rows) {
  const map = {}
  for (const r of rows) {
    const month = r.created_at.slice(0, 7)
    const cost = r.metadata?.cost ?? 0
    const input = r.metadata?.input_tokens ?? 0
    const output = r.metadata?.output_tokens ?? 0
    if (!map[month]) map[month] = { month, cost: 0, input_tokens: 0, output_tokens: 0 }
    map[month].cost += cost
    map[month].input_tokens += input
    map[month].output_tokens += output
  }
  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(d => ({
      ...d,
      cost: +d.cost.toFixed(4),
      input_tokens: Math.round(d.input_tokens),
      output_tokens: Math.round(d.output_tokens),
    }))
}

function costBy(rows, key) {
  const map = {}
  for (const r of rows) {
    const val = r[key] || 'Unknown'
    const cost = r.metadata?.cost ?? 0
    map[val] = (map[val] || 0) + cost
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count: +count.toFixed(4) }))
}

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
      totalInput,
      totalOutput,
      avgTime: count ? totalTime / count : 0,
      count,
      byMonth: groupByMonth(data),
      bySubject: costBy(data, 'subject'),
      byGrade: costBy(data, 'grade_level'),
      byType: costBy(data, 'lesson_type'),
    }
  }, [data])

  const loading = isLoading || !stats

  return (
    <section>
      <SectionTitle>API Cost — Lesson Plans</SectionTitle>

      {/* Top stats */}
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
          sub={loading ? '' : `${formatNumber(stats.count)} plans`}
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

      {/* Cost over time */}
      {!loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
          <p className="mb-4 text-sm font-medium text-gray-500">Monthly API Cost (USD)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.byMonth}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`$${v}`, 'Cost']} />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#costGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Token breakdown by month */}
      {!loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
          <p className="mb-4 text-sm font-medium text-gray-500">Monthly Token Usage — Input vs Output</p>
          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1"><ArrowUp size={12} className="text-indigo-500" /> Total Input Tokens</p>
              <p className="font-semibold text-gray-800">{formatNumber(stats.totalInput)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1"><ArrowDown size={12} className="text-emerald-500" /> Total Output Tokens</p>
              <p className="font-semibold text-gray-800">{formatNumber(stats.totalOutput)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Output / Input Ratio</p>
              <p className="font-semibold text-gray-800">
                {stats.totalInput ? (stats.totalOutput / stats.totalInput).toFixed(2) : '—'}x
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [formatNumber(v), '']} />
              <Legend />
              <Bar dataKey="input_tokens" name="Input" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="output_tokens" name="Output" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cost breakdowns */}
      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BreakdownBar title="Cost by Subject (USD)" data={stats.bySubject} />
          <BreakdownBar title="Cost by Grade (USD)" data={stats.byGrade} />
          <BreakdownBar title="Cost by Plan Type (USD)" data={stats.byType} />
        </div>
      )}
    </section>
  )
}
