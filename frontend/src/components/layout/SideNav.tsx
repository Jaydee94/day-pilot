import { NavLink } from 'react-router-dom'
import { Calendar, Home, ListTodo, Settings, ShoppingCart, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useI18n } from '@/i18n.jsx'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  icon: LucideIcon
  key: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/today', icon: Home, key: 'navToday' },
  { to: '/calendar', icon: Calendar, key: 'navCalendar' },
  { to: '/tasks', icon: ListTodo, key: 'navTasks' },
  { to: '/shopping', icon: ShoppingCart, key: 'navShopping' },
  { to: '/scheduler', icon: Timer, key: 'navScheduler' },
  { to: '/settings', icon: Settings, key: 'navSettings' },
]

/**
 * Material 3 NavigationRail — primary navigation for medium+ viewports.
 * Fixed to the left edge, 80px wide. Hidden below the `md` breakpoint.
 */
export function SideNav(): JSX.Element {
  const { t } = useI18n()

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'hidden md:flex fixed inset-y-0 left-0 z-40 flex-col items-center w-20',
        'bg-surface-container-low border-r border-outline-variant',
        'pt-20 pb-4', // pt to clear sticky header
      )}
    >
      <ul className="flex flex-col items-stretch gap-1 w-full px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'group flex flex-col items-center gap-1 py-2 rounded-2xl text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive && 'text-primary',
                )
              }
              aria-label={t(key)}
              title={t(key)}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'state-layer relative inline-flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-short3',
                      isActive && 'bg-secondary-container text-secondary-container-foreground',
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </span>
                  <span className="text-label-sm leading-none">{t(key)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
