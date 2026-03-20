import { useMemo } from 'react'
import { DollarSign, Zap, Clock, TrendingUp, FileText, FileQuestion } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { SectionTitle } from '@/components/SectionTitle'
import { BreakdownBar } from '@/components/charts/BreakdownBar'
import { useLessonPlanStats, useExamCostStats } from '@/hooks/useMetrics'
import { formatCost, formatNumber } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

// ── helpers ──────────────────────────────────────────────────────────────────

function groupByMonth(rows, getCost) {
  const map = {}
  for (const r of rows) {
    const month = (r.created_at ?? r.metadata?.timestamp ?? '').slice(0, 7)
    if (!month) continue
    map[month] = (map[month] || 0) + getCost(r)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cost]) => ({ month, cost: +cost.toFixed(4) }))
}

function costBy(rows, key, getCost) {
  const map = {}
  for (const r of rows) {
    const val = r[key] || 'Unknown'
    map[val] = (map[val] || 0) + getCost(r)
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count: +count.toFixed(4) }))
}

function lpCost(r) { return r.metadata?.cost ?? 0 }
function examCost(r) { return r.metadata?.cost?.total_cost ?? 0 }

// ── sub-components ────────────────────────────────────────────────────────────

function MonthlyChart({ data, color, label }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
      <p className="mb-4 text-sm font-medium text-gray-500">{label}</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip formatter={(v) => [`$${v}`, 'Cost']} />
          <Area type="monotone" dataKey="cost" stroke={color} strokeWidth={2} fill={`url(#grad-${color.replace('#', '')})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

export function LLMSection() {
  const { data: lpData, isLoading: lpLoading } = useLessonPlanStats()
  const { data: examData, isLoading: examLoading } = useExamCostStats()

  const lp = useMemo(() => {
    if (!lpData) return null
    let totalCost = 0, totalTokens = 0, totalInput = 0, totalOutput = 0, totalTime = 0, count = 0
    for (const r of lpData) {
      const m = r.metadata ?? {}
      totalCost += m.cost ?? 0
      totalTokens += m.total_tokens ?? 0
      totalInput += m.input_tokens ?? 0
      totalOutput += m.output_tokens ?? 0
      totalTime += m.generation_time ?? 0
      count++
    }
    return {
      totalCost, avgCost: count ? totalCost / count : 0,
      totalTokens, totalInput, totalOutput,
      avgTime: count ? totalTime / count : 0,
      count,
      byMonth: groupByMonth(lpData, lpCost),
      bySubject: costBy(lpData, 'subject', lpCost),
      byGrade: costBy(lpData, 'grade_level', lpCost),
      byType: costBy(lpData, 'lesson_type', lpCost),
    }
  }, [lpData])

  const exam = useMemo(() => {
    if (!examData) return null
    let totalCost = 0, totalTokens = 0, totalInput = 0, totalOutput = 0, totalLatency = 0, count = 0
    const modelMap = {}
    for (const r of examData) {
      const m = r.metadata ?? {}
      const cost = m.cost?.total_cost ?? 0
      totalCost += cost
      totalTokens += m.total_tokens ?? 0
      totalInput += m.input_tokens ?? 0
      totalOutput += m.output_tokens ?? 0
      totalLatency += m.api_latency_ms ?? 0
      count++
      if (m.model) modelMap[m.model] = (modelMap[m.model] || 0) + cost
    }
    return {
      totalCost, avgCost: count ? totalCost / count : 0,
      totalTokens, totalInput, totalOutput,
      avgLatency: count ? totalLatency / count / 1000 : 0,
      count,
      byMonth: groupByMonth(examData, examCost),
      byModel: Object.entries(modelMap).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count: +count.toFixed(4) })),
      byGrade: costBy(examData, 'grade', examCost),
      bySubject: costBy(examData, 'subject', examCost),
    }
  }, [examData])

  const combined = useMemo(() => {
    if (!lp || !exam) return null
    // merge monthly series
    const monthMap = {}
    for (const d of lp.byMonth) {
      monthMap[d.month] = { month: d.month, 'Lesson Plans': d.cost, 'Exams': 0 }
    }
    for (const d of exam.byMonth) {
      if (!monthMap[d.month]) monthMap[d.month] = { month: d.month, 'Lesson Plans': 0, 'Exams': 0 }
      monthMap[d.month]['Exams'] = d.cost
    }
    const byMonth = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))
    return {
      totalCost: lp.totalCost + exam.totalCost,
      totalTokens: lp.totalTokens + exam.totalTokens,
      byMonth,
    }
  }, [lp, exam])

  const loading = lpLoading || examLoading || !lp || !exam || !combined

  return (
    <section>
      <SectionTitle>API Cost Overview</SectionTitle>

      {/* ── Combined totals ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard title="Total Combined Cost" value={loading ? '…' : formatCost(combined.totalCost)} sub="lesson plans + exams" icon={DollarSign} />
        <StatCard title="Lesson Plan Cost" value={loading ? '…' : formatCost(lp.totalCost)} sub={loading ? '' : `${formatNumber(lp.count)} plans`} icon={FileText} />
        <StatCard title="Exam Generation Cost" value={loading ? '…' : formatCost(exam.totalCost)} sub={loading ? '' : `${formatNumber(exam.count)} exams`} icon={FileQuestion} />
        <StatCard title="Total Tokens" value={loading ? '…' : formatNumber(combined.totalTokens)} sub="all time" icon={Zap} />
      </div>

      {/* ── Combined monthly chart ── */}
      {!loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm mb-10">
          <p className="mb-4 text-sm font-medium text-gray-500">Monthly Cost — Lesson Plans vs Exams (USD)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={combined.byMonth}>
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
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v, name) => [`$${v}`, name]} />
              <Legend />
              <Area type="monotone" dataKey="Lesson Plans" stroke="#6366f1" strokeWidth={2} fill="url(#lpGrad)" />
              <Area type="monotone" dataKey="Exams" stroke="#f59e0b" strokeWidth={2} fill="url(#examGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Lesson Plan costs ── */}
      <div className="mb-2">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Lesson Plan Generation</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <StatCard title="Total Cost" value={loading ? '…' : formatCost(lp.totalCost)} icon={DollarSign} />
          <StatCard title="Avg Cost / Plan" value={loading ? '…' : formatCost(lp.avgCost)} icon={TrendingUp} />
          <StatCard title="Total Tokens" value={loading ? '…' : formatNumber(lp.totalTokens)} icon={Zap} />
          <StatCard title="Avg Gen Time" value={loading ? '…' : `${lp.avgTime.toFixed(1)}s`} icon={Clock} />
        </div>
        {!loading && (
          <>
            <MonthlyChart data={lp.byMonth} color="#6366f1" label="Monthly Lesson Plan Cost (USD)" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-10">
              <BreakdownBar title="Cost by Subject (USD)" data={lp.bySubject} />
              <BreakdownBar title="Cost by Grade (USD)" data={lp.byGrade} />
              <BreakdownBar title="Cost by Plan Type (USD)" data={lp.byType} />
            </div>
          </>
        )}
      </div>

      {/* ── Exam costs ── */}
      <div>
        <h3 className="text-base font-semibold text-gray-700 mb-4">Exam Generation</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <StatCard title="Total Cost" value={loading ? '…' : formatCost(exam.totalCost)} icon={DollarSign} />
          <StatCard title="Avg Cost / Exam" value={loading ? '…' : formatCost(exam.avgCost)} icon={TrendingUp} />
          <StatCard title="Total Tokens" value={loading ? '…' : formatNumber(exam.totalTokens)} icon={Zap} />
          <StatCard title="Avg Latency" value={loading ? '…' : `${exam.avgLatency.toFixed(1)}s`} icon={Clock} />
        </div>
        {!loading && (
          <>
            <MonthlyChart data={exam.byMonth} color="#f59e0b" label="Monthly Exam Generation Cost (USD)" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <BreakdownBar title="Cost by Model (USD)" data={exam.byModel} />
              <BreakdownBar title="Cost by Grade (USD)" data={exam.byGrade} />
              <BreakdownBar title="Cost by Subject (USD)" data={exam.bySubject} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}
