import { useMemo } from 'react'
import { Users, UserCheck, Building2, ShieldCheck } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { SectionTitle } from '@/components/SectionTitle'
import { BreakdownBar } from '@/components/charts/BreakdownBar'
import { useUserStats, useLessonPlanStats } from '@/hooks/useMetrics'

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

export function UserSection() {
  const { data: users, isLoading: loadingUsers } = useUserStats()
  const { data: plans, isLoading: loadingPlans } = useLessonPlanStats()

  const stats = useMemo(() => {
    if (!users || !plans) return null

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentUserIds = new Set(
      plans
        .filter(p => new Date(p.created_at) >= thirtyDaysAgo)
        .map(p => p.created_by_id)
    )

    return {
      total: users.length,
      approved: users.filter(u => u.is_approved).length,
      active30: recentUserIds.size,
      byBranch: countBy(users, 'school_branch'),
      byRole: countBy(users, 'role'),
    }
  }, [users, plans])

  const loading = loadingUsers || loadingPlans || !stats

  return (
    <section>
      <SectionTitle>User Metrics</SectionTitle>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard title="Total Users" value={loading ? '…' : stats.total} icon={Users} />
        <StatCard title="Approved" value={loading ? '…' : stats.approved} icon={ShieldCheck} />
        <StatCard title="Active (30d)" value={loading ? '…' : stats.active30} icon={UserCheck} />
        <StatCard
          title="Principals"
          value={loading ? '…' : (stats?.byRole?.find(r => r.name === 'principal')?.count ?? 0)}
          icon={Building2}
        />
      </div>
      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BreakdownBar title="Users by School Branch" data={stats.byBranch} />
          <BreakdownBar title="Users by Role" data={stats.byRole} />
        </div>
      )}
    </section>
  )
}
