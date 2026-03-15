import { useMemo } from 'react'
import { DollarSign, Zap, Hash, AlertCircle } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { SectionTitle } from '@/components/SectionTitle'
import { BreakdownBar } from '@/components/charts/BreakdownBar'
import { useOpenRouterLogs } from '@/hooks/useOpenRouterLogs'
import { formatCost, formatNumber } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

function groupCostByDay(rows) {
  const map = {}
  for (const r of rows) {
    const day = r.created_at.slice(0, 10)
    if (!map[day]) map[day] = { date: day, 'Lesson Plan': 0, 'Exam Generation': 0 }
    map[day][r.service] = (map[day][r.service] || 0) + r.cost
  }
  return Object.values(map)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      'Lesson Plan': +d['Lesson Plan'].toFixed(4),
      'Exam Generation': +d['Exam Generation'].toFixed(4),
    }))
}

function costBy(rows, key) {
  const map = {}
  for (const r of rows) {
    const val = r[key] || 'Unknown'
    map[val] = (map[val] || 0) + r.cost
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([name, cost]) => ({ name, count: +cost.toFixed(4) }))
}

function countBy(rows, key) {
  const map = {}
  for (const r of rows) {
    const val = r[key] || 'Unknown'
    map[val] = (map[val] || 0) + 1
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }))
}

function serviceStats(rows) {
  const totalCost = rows.reduce((s, r) => s + r.cost, 0)
  const count = rows.length
  return {
    totalCost,
    avgCost: count ? totalCost / count : 0,
    count,
    totalTokens: rows.reduce((s, r) => s + r.tokens_prompt + r.tokens_completion, 0),
    byModel: costBy(rows, 'model'),
  }
}

function ServicePanel({ title, stats, color }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold" style={{ color }}>{title}</p>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-400">Total Cost</p>
          <p className="text-lg font-semibold text-gray-900">{formatCost(stats.totalCost)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Avg / Call</p>
          <p className="text-lg font-semibold text-gray-900">{formatCost(stats.avgCost)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Calls</p>
          <p className="text-lg font-semibold text-gray-900">{formatNumber(stats.count)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Tokens</p>
          <p className="text-lg font-semibold text-gray-900">{formatNumber(stats.totalTokens)}</p>
        </div>
      </div>
      <BreakdownBar title="Cost by Model (USD)" data={stats.byModel} />
    </div>
  )
}

export function OpenRouterSection() {
  const { data, isLoading } = useOpenRouterLogs()

  const stats = useMemo(() => {
    if (!data) return null
    const active = data.filter(r => !r.cancelled)
    const lp = active.filter(r => r.service === 'Lesson Plan')
    const exam = active.filter(r => r.service === 'Exam Generation')

    return {
      totalCost: active.reduce((s, r) => s + r.cost, 0),
      totalCount: active.length,
      cancelled: data.filter(r => r.cancelled).length,
      totalTokens: active.reduce((s, r) => s + r.tokens_prompt + r.tokens_completion, 0),
      costByDay: groupCostByDay(active),
      lp: serviceStats(lp),
      exam: serviceStats(exam),
    }
  }, [data])

  if (isLoading) return (
    <section>
      <SectionTitle>OpenRouter Logs</SectionTitle>
      <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
    </section>
  )

  return (
    <section>
      <SectionTitle>OpenRouter Logs</SectionTitle>

      {/* Overall totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard title="Total API Cost" value={formatCost(stats.totalCost)} sub="Jan 16 – Mar 15" icon={DollarSign} />
        <StatCard title="Total Generations" value={formatNumber(stats.totalCount)} icon={Hash} />
        <StatCard title="Total Tokens" value={formatNumber(stats.totalTokens)} icon={Zap} />
        <StatCard title="Cancelled" value={stats.cancelled} sub="skipped in analysis" icon={AlertCircle} />
      </div>

      {/* Daily cost split by service */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <p className="mb-4 text-sm font-medium text-gray-500">Daily API Cost by Service (USD)</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={stats.costByDay}>
            <defs>
              <linearGradient id="lpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="examGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v, name) => [`$${v}`, name]} />
            <Legend />
            <Area type="monotone" dataKey="Lesson Plan" stroke="#6366f1" strokeWidth={2} fill="url(#lpGrad)" />
            <Area type="monotone" dataKey="Exam Generation" stroke="#f59e0b" strokeWidth={2} fill="url(#examGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-service breakdown */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ServicePanel title="Lesson Plan Generation" stats={stats.lp} color="#6366f1" />
        <ServicePanel title="Exam Generation" stats={stats.exam} color="#f59e0b" />
      </div>
    </section>
  )
}
