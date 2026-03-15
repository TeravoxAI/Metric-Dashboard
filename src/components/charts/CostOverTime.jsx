import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useActivePlansPerDay } from '@/hooks/useMetrics'

function groupCostByDay(rows) {
  const map = {}
  for (const row of rows) {
    const day = row.created_at.slice(0, 10)
    const cost = row.metadata?.cost ?? 0
    map[day] = (map[day] || 0) + cost
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost: +cost.toFixed(4) }))
}

export function CostOverTime() {
  const { data, isLoading } = useActivePlansPerDay(30)

  const chartData = useMemo(() => {
    if (!data) return []
    return groupCostByDay(data)
  }, [data])

  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-gray-100" />

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-gray-500">Daily Cost — Last 30 Days (USD)</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [`$${v}`, 'Cost']} />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
