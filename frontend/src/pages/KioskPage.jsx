import { useState, useEffect } from 'react'
import { useI18n } from '../i18n.jsx'
import './KioskPage.css'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatClock(date, locale) {
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function formatDate(iso, locale) {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso, locale) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function KioskPage() {
  const { t, locale } = useI18n()
  const [summary, setSummary] = useState(null)
  const [clock, setClock] = useState(new Date())
  const [error, setError] = useState(null)

  // Refresh interval from ?refresh=N (seconds), default 5 min
  const refreshSec = parseInt(new URLSearchParams(window.location.search).get('refresh') || '300', 10)

  async function loadSummary() {
    try {
      const resp = await fetch(`${API_BASE}/summary`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      setSummary(await resp.json())
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  // Live clock
  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  // Summary auto-refresh
  useEffect(() => {
    loadSummary()
    const interval = setInterval(loadSummary, refreshSec * 1000)
    return () => clearInterval(interval)
  }, [refreshSec])

  const events = summary?.events ?? []
  const todos = (summary?.todos ?? []).filter(t => !t.completed)
  const weather = summary?.weather

  return (
    <div className="kiosk">
      <div className="kiosk__clock">{formatClock(clock, locale)}</div>
      {summary && (
        <div className="kiosk__date">{formatDate(summary.date, locale)}</div>
      )}

      {weather && (
        <div className="kiosk__weather">
          {weather.description} &nbsp;·&nbsp;
          {weather.temperature}{weather.units === 'metric' ? '°C' : '°F'} &nbsp;·&nbsp;
          {weather.city}
        </div>
      )}

      {error && <p className="kiosk__error">{error}</p>}

      <div className="kiosk__grid">
        <section className="kiosk__section">
          <h2 className="kiosk__section-title">{t('kioskEventsSection')}</h2>
          {events.length === 0 ? (
            <p className="kiosk__empty">{t('noEventsToday')}</p>
          ) : (
            <ul className="kiosk__list">
              {events.map(ev => (
                <li key={ev.id} className="kiosk__item">
                  <span className="kiosk__item-time">
                    {formatTime(ev.start, locale)}–{formatTime(ev.end, locale)}
                  </span>
                  <span className="kiosk__item-text">{ev.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="kiosk__section">
          <h2 className="kiosk__section-title">{t('kioskTasksSection')}</h2>
          {todos.length === 0 ? (
            <p className="kiosk__empty">{t('noTasks')}</p>
          ) : (
            <ul className="kiosk__list">
              {todos.map(todo => (
                <li key={todo.id} className="kiosk__item">
                  <span className="kiosk__item-bullet">·</span>
                  <span className="kiosk__item-text">{todo.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
