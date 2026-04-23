import { useState, useEffect } from 'react'
import CalendarEvents from '../components/CalendarEvents.jsx'
import QuickAddButton from '../components/QuickAddButton.jsx'
import { fetchEvents } from '../api.js'
import { useI18n } from '../i18n.jsx'
import './Page.css'

/**
 * CalendarPage fetches its own event data from /api/events.
 * This endpoint never triggers an AI call – it only reads calendar data.
 */
export default function CalendarPage() {
  const { t } = useI18n()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadEvents() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchEvents()
      setEvents(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  return (
    <div className="page">
      <h2 className="page__title">{t('calendarTitle')}</h2>
      <p className="page__subtitle">{t('calendarSubtitle')}</p>
      {loading && events.length === 0 && (
        <div className="loading-state">
          <div className="spinner" />
        </div>
      )}
      {error && (
        <div className="error-state">
          <span>⚠️</span>
          <p>{error}</p>
          <button className="btn" onClick={loadEvents}>{t('tryAgain')}</button>
        </div>
      )}
      {!loading && !error && <CalendarEvents events={events} />}
      <QuickAddButton defaultTab="Event" onSuccess={loadEvents} />
    </div>
  )
}
