import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/explorer', label: 'Explorer' },
]

export function Nav({ onLogout }) {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
      <nav className="flex gap-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            )}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <h1 className="text-xl font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2">
        APS Dashboard
      </h1>

      <button
        onClick={onLogout}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
      >
        <LogOut size={15} />
        Sign out
      </button>
    </header>
  )
}
