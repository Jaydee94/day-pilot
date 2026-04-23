import { useState, useEffect } from 'react'
import AppIcon from './AppIcon.jsx'
import { fetchBirthdays } from '../api.js'
import { useI18n } from '../i18n.jsx'
import './UpcomingBirthdays.css'

/** Maximum number of upcoming birthdays to display. */
const MAX_BIRTHDAYS = 5

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
 * UpcomingBirthdays fetches and displays the next upcoming birthday events
 * (up to 5) for the next 14 days.  The card is always visible so users know
 * where to find birthday information even when the list is empty.
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

  const displayed = birthdays.slice(0, MAX_BIRTHDAYS)

  return (
    <div className="upcoming-birthdays card">
      <div className="card__header">
        <span className="card__icon"><AppIcon name="birthday" className="icon" /></span>
        <span className="card__title">{t('upcomingBirthdays')}</span>
      </div>

      {loading ? (
        <div className="upcoming-birthdays__empty" aria-busy="true" aria-label={t('upcomingBirthdays')} />
      ) : displayed.length === 0 ? (
        <p className="upcoming-birthdays__empty">{t('noUpcomingBirthdays')}</p>
      ) : (
        <ul className="upcoming-birthdays__list">
          {displayed.map((b) => (
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
      )}
    </div>
  )
}
