import { useMemo } from 'react'
import { FileQuestion, BookOpen, GraduationCap } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { SectionTitle } from '@/components/SectionTitle'
import { ExamsOverTime } from '@/components/charts/ExamsOverTime'
import { BreakdownBar } from '@/components/charts/BreakdownBar'
import { useExamStats } from '@/hooks/useMetrics'

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

export function ExamGenerationSection() {
  const { data, isLoading } = useExamStats()

  const { total, bySubject, byGrade } = useMemo(() => {
    if (!data) return {}
    return {
      total: data.length,
      bySubject: countBy(data, 'subject'),
      byGrade: countBy(data, 'grade'),
    }
  }, [data])

  const loading = isLoading || !data

  return (
    <section>
      <SectionTitle>Exam Generation Activity</SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard title="Total Exams Generated" value={loading ? '…' : total} icon={FileQuestion} />
        <StatCard
          title="English Exams"
          value={loading ? '…' : (bySubject?.find(s => s.name === 'English')?.count ?? 0)}
          icon={BookOpen}
        />
        <StatCard
          title="Math Exams"
          value={loading ? '…' : (bySubject?.find(s => s.name === 'Mathematics')?.count ?? 0)}
          icon={GraduationCap}
        />
      </div>
      <div className="mb-6">
        <ExamsOverTime />
      </div>
      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BreakdownBar title="Exams by Grade" data={byGrade} />
          <BreakdownBar title="Exams by Subject" data={bySubject} />
        </div>
      )}
    </section>
  )
}
