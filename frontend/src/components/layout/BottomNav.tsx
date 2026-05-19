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
 * Material 3 NavigationBar — primary navigation for compact viewports.
 * Sits fixed at the bottom, respects the iOS home-indicator safe-area.
 * Hidden on `md+` viewports where SideNav takes over.
 */
export function BottomNav(): JSX.Element {
  const { t } = useI18n()

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'md:hidden fixed bottom-0 inset-x-0 z-40',
        'bg-surface-container/95 backdrop-blur-md border-t border-outline-variant',
        'pb-safe',
      )}
    >
      <ul className="flex items-stretch justify-around max-w-2xl mx-auto px-1">
        {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'group flex flex-col items-center gap-1 px-1 pt-2 pb-2 min-h-[64px] text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg',
                  isActive && 'text-primary',
                )
              }
              aria-label={t(key)}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'state-layer relative inline-flex items-center justify-center w-16 h-8 rounded-full transition-colors duration-short3',
                      isActive && 'bg-secondary-container text-secondary-container-foreground',
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </span>
                  <span className="text-label-md leading-none">{t(key)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
