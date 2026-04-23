import './CalendarEvents.css'
import AppIcon from './AppIcon.jsx'
import { useI18n } from '../i18n.jsx'

function formatTime(iso, locale) {
  const d = new Date(iso)
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatCountdown(isoStart, isoEnd, t) {
  const now = Date.now()
  const start = new Date(isoStart).getTime()
  const end = new Date(isoEnd).getTime()

  if (now >= end) return null
  if (now >= start) return { label: t('eventRunning'), running: true }

  const diffMin = Math.ceil((start - now) / 60000)
  if (diffMin < 1) return { label: t('inXMin', { min: 1 }), running: false }
  if (diffMin < 60) return { label: t('inXMin', { min: diffMin }), running: false }
  const h = Math.floor(diffMin / 60)
  const min = diffMin % 60
  if (min === 0) return { label: t('inXh', { h }), running: false }
  return { label: t('inXhYmin', { h, min }), running: false }
}

const SOURCE_LABEL = {
  google: { label: 'Google', color: '#4285F4' },
  ical: { label: 'iCal', color: '#4285F4' },
  apple: { label: 'Apple', color: '#A3AAAE' },
}

export default function CalendarEvents({ events }) {
  const { t, locale } = useI18n()

  return (
    <div className="cal-events card">
      <div className="card__header">
        <span className="card__icon"><AppIcon name="calendar" className="icon" /></span>
        <span className="card__title">{t('eventsCount', { count: events.length })}</span>
      </div>

      {events.length === 0 ? (
        <p className="card__empty">{t('noEventsToday')}</p>
      ) : (
        <ul className="cal-events__list">
          {events.map((ev) => {
            const src = SOURCE_LABEL[ev.source] || { label: ev.source, color: '#888' }
            const countdown = formatCountdown(ev.start, ev.end, t)
            return (
              <li key={ev.id} className="cal-events__item">
                <div className="cal-events__time">
                  <span>{formatTime(ev.start, locale)}</span>
                  <span className="cal-events__time-end">{formatTime(ev.end, locale)}</span>
                </div>
                <div className="cal-events__content">
                  <span className="cal-events__title">{ev.title}</span>
                  {ev.location && (
                    <span className="cal-events__location"><AppIcon name="mapPin" className="icon" /> {ev.location}</span>
                  )}
                </div>
                <div className="cal-events__badges">
                  {countdown && (
                    <span className={`cal-events__countdown${countdown.running ? ' cal-events__countdown--running' : ''}`}>
                      {countdown.label}
                    </span>
                  )}
                  <span
                    className="cal-events__source"
                    style={{ borderColor: src.color, color: src.color }}
                  >
                    {src.label}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
