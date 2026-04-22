import { NavLink } from 'react-router-dom'
import './Navigation.css'

const NAV_ITEMS = [
  { to: '/today', icon: '🏠', label: 'Today' },
  { to: '/calendar', icon: '📅', label: 'Calendar' },
  { to: '/tasks', icon: '✅', label: 'Tasks' },
  { to: '/scheduler', icon: '⏱️', label: 'Scheduler' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function Navigation() {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
        >
          <span className="bottom-nav__icon">{icon}</span>
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
