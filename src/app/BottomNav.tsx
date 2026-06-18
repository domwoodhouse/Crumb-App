import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/starter', label: 'Starter' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/plan', label: 'Plan' },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-stone-200 bg-white">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex-1 py-3 text-center text-sm font-medium ${
              isActive ? 'text-amber-800' : 'text-stone-500'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
