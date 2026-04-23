import { useState, useEffect } from 'react'
import AppIcon from './AppIcon.jsx'
import { fetchBirthdays } from '../api.js'
import { useI18n } from '../i18n.jsx'
import './UpcomingBirthdays.css'

/** Format the birthday date relative to today for display. */
function formatRelativeDate(isoDate, t, locale) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(isoDate)
  date.setHours(0, 0, 0, 0)
  const diffDays = Math.round((date - today) / 86400000)

  if (diffDays === 0) return t('birthdayToday')
  if (diffDays === 1) return t('birthdayTomorrow')
  if (diffDays <= 7) return t('birthdayInXDays', { days: diffDays })

  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

/**
 * UpcomingBirthdays fetches and displays birthday events for the next 14 days.
 * It manages its own loading / error state so the dashboard never blocks on it.
 */
export default function UpcomingBirthdays() {
  const { t, locale } = useI18n()
  const [birthdays, setBirthdays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBirthdays(14)
      .then(setBirthdays)
      .catch(() => setBirthdays([]))
      .finally(() => setLoading(false))
  }, [])

  // Don't render the card at all while loading or when there are no upcoming birthdays.
  if (loading || birthdays.length === 0) return null

  return (
    <div className="upcoming-birthdays card">
      <div className="card__header">
        <span className="card__icon"><AppIcon name="birthday" className="icon" /></span>
        <span className="card__title">{t('upcomingBirthdays')}</span>
      </div>

      <ul className="upcoming-birthdays__list">
        {birthdays.map((b) => (
          <li key={`${b.name}-${b.date}`} className="upcoming-birthdays__item">
            <div className="upcoming-birthdays__info">
              <span className="upcoming-birthdays__name">{b.name}</span>
              {b.age != null && (
                <span className="upcoming-birthdays__age">{t('turnsAge', { age: b.age })}</span>
              )}
            </div>
            <span className="upcoming-birthdays__date">
              {formatRelativeDate(b.date, t, locale)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
