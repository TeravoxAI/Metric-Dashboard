import { useMemo } from 'react'
import { BookCopy, ClipboardList, FileQuestion } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { SectionTitle } from '@/components/SectionTitle'
import { BreakdownBar } from '@/components/charts/BreakdownBar'
import { useContentStats } from '@/hooks/useMetrics'

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

export function ContentSection() {
  const { data, isLoading } = useContentStats()

  const stats = useMemo(() => {
    if (!data) return null
    return {
      textbookCount: data.textbooks.length,
      sowCount: data.sowEntries.length,
      examCount: data.exams.length,
      byBookTag: countBy(data.textbooks, 'book_tag'),
      byExamSubject: countBy(data.exams, 'subject'),
    }
  }, [data])

  const loading = isLoading || !stats

  return (
    <section>
      <SectionTitle>DB Content</SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard title="Textbooks" value={loading ? '…' : stats.textbookCount} icon={BookCopy} />
        <StatCard title="SOW Entries" value={loading ? '…' : stats.sowCount} icon={ClipboardList} />
        <StatCard title="Exams Generated" value={loading ? '…' : stats.examCount} icon={FileQuestion} />
      </div>
      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BreakdownBar title="Textbooks by Book Tag" data={stats.byBookTag} />
          <BreakdownBar title="Exams by Subject" data={stats.byExamSubject} />
        </div>
      )}
    </section>
  )
}
