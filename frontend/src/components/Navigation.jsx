import { NavLink } from 'react-router-dom'
import AppIcon from './AppIcon.jsx'
import './Navigation.css'

const NAV_ITEMS = [
  { to: '/today', icon: 'home', label: 'Today' },
  { to: '/calendar', icon: 'calendar', label: 'Calendar' },
  { to: '/tasks', icon: 'tasks', label: 'Tasks' },
  { to: '/scheduler', icon: 'scheduler', label: 'Scheduler' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
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
          <span className="bottom-nav__icon">
            <AppIcon name={icon} className="bottom-nav__icon-svg" />
          </span>
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
