import { useMemo, useState } from 'react'
import { useDebounce } from 'use-debounce'
import { useExplorerData } from '@/hooks/useMetrics'
import { Select } from '@/components/Select'
import { StatCard } from '@/components/StatCard'
import { BreakdownBar } from '@/components/charts/BreakdownBar'
import { formatCost, formatNumber } from '@/lib/utils'
import { FileText, DollarSign, Zap, Users } from 'lucide-react'

function unique(arr) {
  return [...new Set(arr.filter(Boolean))].sort()
}

function countBy(rows, fn) {
  const map = {}
  for (const r of rows) {
    const val = fn(r) || 'Unknown'
    map[val] = (map[val] || 0) + 1
  }
  return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }))
}

const SERVICE_LABELS = { all: 'All', lesson_plan: 'Lesson Plans', exam: 'Exams' }

export function Explorer() {
  const { data, isLoading } = useExplorerData()

  const [service, setService] = useState('all')
  const changeService = (val) => {
    setService(val)
    setFilters(f => ({ ...f, teacher: '', branch: '' }))
  }
  const [filters, setFilters] = useState({
    branch: '', teacher: '', grade: '', subject: '',
    bookTag: '', status: '',
    dateFrom: '', dateTo: '',
  })

  const [debouncedFilters] = useDebounce(filters, 300)

  const set = (key) => (val) => setFilters(f => {
    const next = { ...f, [key]: val }
    if ((key === 'grade' || key === 'subject' || key === 'branch') && f.teacher && data) {
      const u = data.users.find(u => u.id === f.teacher)
      const gradeNum = next.grade?.replace('Grade ', '')
      const gradeOk = !next.grade || u?.grade === gradeNum || u?.grade === next.grade
      const subjectOk = !next.subject || u?.subject === next.subject
      const branchOk = !next.branch || u?.school_branch === next.branch
      if (!gradeOk || !subjectOk || !branchOk) next.teacher = ''
    }
    return next
  })

  const options = useMemo(() => {
    if (!data) return {}
    const { plans, exams, users, textbooks } = data

    // Restrict users to those who have activity in the selected service
    const activeUserIds = service === 'lesson_plan'
      ? new Set(plans.map(p => p.created_by_id))
      : service === 'exam'
        ? new Set(exams.map(e => e.created_by))
        : null // null means all users

    const serviceUsers = activeUserIds
      ? users.filter(u => activeUserIds.has(u.id))
      : users

    // Grades from relevant services
    const allGrades = unique([
      ...(service !== 'exam' ? plans.map(p => p._grade) : []),
      ...(service !== 'lesson_plan' ? exams.map(e => e._grade) : []),
    ])

    const filteredTeachers = serviceUsers.filter(u => {
      if (filters.branch && u.school_branch !== filters.branch) return false
      if (filters.grade) {
        const gradeNum = filters.grade.replace('Grade ', '')
        if (u.grade !== gradeNum && u.grade !== filters.grade) return false
      }
      if (filters.subject && u.subject !== filters.subject) return false
      return true
    })

    return {
      branches: unique(serviceUsers.map(u => u.school_branch)),
      teachers: filteredTeachers.map(u => ({
        value: u.id,
        label: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
      })),
      grades: allGrades,
      subjects: unique([
        ...(service !== 'exam' ? plans.map(p => p.subject) : []),
        ...(service !== 'lesson_plan' ? exams.map(e => e.subject) : []),
      ]),
      bookTags: unique(textbooks.map(t => t.book_tag)),
      statuses: unique(exams.map(e => e.status)),
    }
  }, [data, service, filters.branch, filters.grade, filters.subject])

  // Merge and filter rows
  const { filteredPlans, filteredExams } = useMemo(() => {
    if (!data) return { filteredPlans: [], filteredExams: [] }
    const f = debouncedFilters

    const applyCommon = (rows, getUserId) => rows.filter(r => {
      if (f.branch && r.user?.school_branch !== f.branch) return false
      if (f.teacher && getUserId(r) !== f.teacher) return false
      if (f.grade && r._grade !== f.grade) return false
      if (f.subject && r.subject !== f.subject) return false
      if (f.dateFrom && r.created_at < f.dateFrom) return false
      if (f.dateTo && r.created_at > f.dateTo + 'T23:59:59') return false
      return true
    })

    const fp = (service === 'exam') ? [] : applyCommon(data.plans, r => r.created_by_id).filter(r => {
      if (f.bookTag && r.textbook?.book_tag !== f.bookTag) return false
      return true
    })

    const fe = (service === 'lesson_plan') ? [] : applyCommon(data.exams, r => r.created_by).filter(r => {
      if (f.status && r.status !== f.status) return false
      return true
    })

    return { filteredPlans: fp, filteredExams: fe }
  }, [data, debouncedFilters, service])

  const stats = useMemo(() => {
    const allRows = [...filteredPlans, ...filteredExams]
    return {
      totalCost: allRows.reduce((s, r) => s + r._cost, 0),
      totalTokens: [
        ...filteredPlans.map(r => r.metadata?.total_tokens ?? 0),
        ...filteredExams.map(r => r.metadata?.total_tokens ?? 0),
      ].reduce((s, v) => s + v, 0),
      uniqueTeachers: new Set([
        ...filteredPlans.map(r => r.created_by_id),
        ...filteredExams.map(r => r.created_by),
      ]).size,
    }
  }, [filteredPlans, filteredExams])

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  if (isLoading) return <div className="p-8 text-sm text-gray-400">Loading data…</div>

  const showLPs = service !== 'exam'
  const showExams = service !== 'lesson_plan'

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">

      {/* Service toggle */}
      <div className="flex gap-2">
        {Object.entries(SERVICE_LABELS).map(([val, label]) => (
          <button
            key={val}
            onClick={() => changeService(val)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              service === val
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({ branch: '', teacher: '', grade: '', subject: '', bookTag: '', status: '', dateFrom: '', dateTo: '' })}
              className="text-xs text-indigo-600 hover:underline"
            >
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Select label="School Branch" value={filters.branch} onChange={set('branch')} options={options.branches ?? []} />
          <Select label="Teacher" value={filters.teacher} onChange={set('teacher')} options={options.teachers ?? []} />
          <Select label="Grade" value={filters.grade} onChange={set('grade')} options={options.grades ?? []} />
          <Select label="Subject" value={filters.subject} onChange={set('subject')} options={options.subjects ?? []} />


          {showLPs && (
            <Select label="Textbook Tag" value={filters.bookTag} onChange={set('bookTag')} options={options.bookTags ?? []} />
          )}
          {showExams && (
            <Select label="Exam Status" value={filters.status} onChange={set('status')} options={options.statuses ?? []} />
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Date From</label>
            <input type="date" value={filters.dateFrom} onChange={e => set('dateFrom')(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Date To</label>
            <input type="date" value={filters.dateTo} onChange={e => set('dateTo')(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {showLPs && <StatCard title="Lesson Plans" value={formatNumber(filteredPlans.length)} icon={FileText} />}
        {showExams && <StatCard title="Exams" value={formatNumber(filteredExams.length)} icon={FileText} />}
        <StatCard title="Total Cost" value={formatCost(stats.totalCost)} icon={DollarSign} />
        <StatCard title="Total Tokens" value={formatNumber(stats.totalTokens)} icon={Zap} />
        <StatCard title="Teachers" value={stats.uniqueTeachers} icon={Users} />
      </div>

      {/* Breakdown charts */}
      {(filteredPlans.length > 0 || filteredExams.length > 0) && (() => {
        const allRows = [...filteredPlans, ...filteredExams]
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BreakdownBar title="By School Branch" data={countBy(allRows, r => r.user?.school_branch)} />
            <BreakdownBar title="By Teacher" data={
              countBy(allRows, r => r.user ? `${r.user.first_name ?? ''} ${r.user.last_name ?? ''}`.trim() || r.user.email : 'Unknown').slice(0, 10)
            } />
            <BreakdownBar title="By Grade" data={countBy(allRows, r => r._grade)} />
            <BreakdownBar title="By Subject" data={countBy(allRows, r => r.subject)} />
            {showLPs && <BreakdownBar title="By Textbook Tag" data={countBy(filteredPlans, r => r.textbook?.book_tag)} />}
            {showExams && <BreakdownBar title="By Exam Status" data={countBy(filteredExams, r => r.status)} />}
          </div>
        )
      })()}

      {/* Textbooks table — only when lesson plans in scope */}
      {showLPs && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Textbooks in DB</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  {['Title', 'Subject', 'Grade', 'Book Tag', 'Book Type'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.textbooks ?? [])
                  .filter(t => !filters.subject || t.subject === filters.subject)
                  .filter(t => !filters.bookTag || t.book_tag === filters.bookTag)
                  .map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{t.title}</td>
                      <td className="px-4 py-3 text-gray-600">{t.subject}</td>
                      <td className="px-4 py-3 text-gray-600">{t.grade_level}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{t.book_tag}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.book_type}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lesson Plans table */}
      {showLPs && filteredPlans.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Lesson Plans</h2>
            <span className="text-xs text-gray-400">{filteredPlans.length} results</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  {['Date', 'Teacher', 'Branch', 'Grade', 'Subject', 'Type', 'Topic', 'Textbook', 'Cost'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPlans.slice(0, 100).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.created_at.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                      {p.user ? `${p.user.first_name ?? ''} ${p.user.last_name ?? ''}`.trim() || p.user.email : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.user?.school_branch ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.grade_level}</td>
                    <td className="px-4 py-3 text-gray-600">{p.subject}</td>
                    <td className="px-4 py-3 text-gray-600">{p.lesson_type}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{p.topic ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.textbook ? `${p.textbook.book_tag} G${p.textbook.grade_level}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatCost(p._cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPlans.length > 100 && (
              <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-100">
                Showing first 100 of {filteredPlans.length} results. Apply filters to narrow down.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Exams table */}
      {showExams && filteredExams.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Exams</h2>
            <span className="text-xs text-gray-400">{filteredExams.length} results</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  {['Date', 'Teacher', 'Branch', 'Grade', 'Subject', 'Status', 'Total Marks', 'Questions', 'Obj / Subj', 'Cost'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExams.slice(0, 100).map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.created_at.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                      {e.user ? `${e.user.first_name ?? ''} ${e.user.last_name ?? ''}`.trim() || e.user.email : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.user?.school_branch ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e._grade}</td>
                    <td className="px-4 py-3 text-gray-600">{e.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center">{e.total_marks ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">{e.total_questions ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">
                      {e.objective_questions_count ?? 0} / {e.subjective_questions_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatCost(e._cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredExams.length > 100 && (
              <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-100">
                Showing first 100 of {filteredExams.length} results. Apply filters to narrow down.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
