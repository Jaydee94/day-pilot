import { NavLink } from 'react-router-dom'
import AppIcon from './AppIcon.jsx'
import { useI18n } from '../i18n.jsx'
import './Navigation.css'

const NAV_ITEMS = [
  { to: '/today', icon: 'home', key: 'navToday' },
  { to: '/calendar', icon: 'calendar', key: 'navCalendar' },
  { to: '/tasks', icon: 'tasks', key: 'navTasks' },
  { to: '/scheduler', icon: 'scheduler', key: 'navScheduler' },
  { to: '/settings', icon: 'settings', key: 'navSettings' },
]

export default function Navigation() {
  const { t } = useI18n()

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ to, icon, key }) => (
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
          <span className="bottom-nav__label">{t(key)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
