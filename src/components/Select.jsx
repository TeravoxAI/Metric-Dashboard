import { cn } from '@/lib/utils'

export function Select({ label, value, onChange, options, placeholder = 'All' }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-indigo-300'
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </div>
  )
}
