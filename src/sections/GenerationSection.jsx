import { useMemo } from 'react'
import { FileText, BookOpen, GraduationCap } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { SectionTitle } from '@/components/SectionTitle'
import { PlansOverTime } from '@/components/charts/PlansOverTime'
import { BreakdownBar } from '@/components/charts/BreakdownBar'
import { useLessonPlanStats } from '@/hooks/useMetrics'

function countBy(data, key) {
  const map = {}
  for (const row of data) {
    const val = row[key] ?? 'Unknown'
    map[val] = (map[val] || 0) + 1
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }))
}

export function GenerationSection() {
  const { data, isLoading } = useLessonPlanStats()

  const { total, bySubject, byGrade, byType } = useMemo(() => {
    if (!data) return {}
    return {
      total: data.length,
      bySubject: countBy(data, 'subject'),
      byGrade: countBy(data, 'grade_level'),
      byType: countBy(data, 'lesson_type'),
    }
  }, [data])

  const loading = isLoading || !data

  return (
    <section>
      <SectionTitle>Generation Activity</SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard title="Total Lesson Plans" value={loading ? '…' : total} icon={FileText} />
        <StatCard
          title="English Plans"
          value={loading ? '…' : (bySubject?.find(s => s.name === 'English')?.count ?? 0)}
          icon={BookOpen}
        />
        <StatCard
          title="Math Plans"
          value={loading ? '…' : (bySubject?.find(s => s.name === 'Mathematics')?.count ?? 0)}
          icon={GraduationCap}
        />
      </div>
      <div className="mb-6">
        <PlansOverTime />
      </div>
      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BreakdownBar title="Plans by Grade" data={byGrade} />
          <BreakdownBar title="Plans by Type" data={byType} />
        </div>
      )}
    </section>
  )
}
