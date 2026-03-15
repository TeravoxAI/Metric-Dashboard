import { cn } from '@/lib/utils'

export function StatCard({ title, value, sub, icon: Icon, className }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {Icon && (
          <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Icon size={16} />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
