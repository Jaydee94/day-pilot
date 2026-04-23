import { useState, useEffect } from 'react'
import CalendarEvents from '../components/CalendarEvents.jsx'
import QuickAddButton from '../components/QuickAddButton.jsx'
import { fetchEvents, fetchSyncStatus, triggerSchedulerJob } from '../api.js'
import { useI18n } from '../i18n.jsx'
import './Page.css'
import './CalendarPage.css'

/**
 * CalendarPage fetches its own event data from /api/events.
 * This endpoint never triggers an AI call – it only reads calendar data.
 */
export default function CalendarPage() {
  const { t, locale } = useI18n()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState(null)

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

  async function loadSyncStatus() {
    try {
      const status = await fetchSyncStatus()
      setLastSync(status.last_sync || null)
    } catch {
      // Sync status is best-effort – don't block the calendar view
    }
  }

  async function handleSyncNow() {
    setSyncing(true)
    setSyncFeedback(null)
    try {
      await triggerSchedulerJob('calendar_sync')
      setSyncFeedback('ok')
      // Give the sync job a moment to complete before reloading data
      setTimeout(async () => {
        await Promise.all([loadEvents(), loadSyncStatus()])
      }, 2000)
    } catch {
      setSyncFeedback('error')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadEvents()
    loadSyncStatus()
  }, [])

  function formatLastSync(isoString) {
    if (!isoString) return t('calendarNeverSynced')
    const d = new Date(isoString)
    return d.toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="page">
      <h2 className="page__title">{t('calendarTitle')}</h2>
      <p className="page__subtitle">{t('calendarSubtitle')}</p>

      <div className="calendar-sync-bar">
        <span className="calendar-sync-bar__status">
          {t('calendarLastSync', { time: formatLastSync(lastSync) })}
        </span>
        <div className="calendar-sync-bar__actions">
          {syncFeedback === 'ok' && (
            <span className="calendar-sync-bar__feedback calendar-sync-bar__feedback--ok">✓</span>
          )}
          {syncFeedback === 'error' && (
            <span className="calendar-sync-bar__feedback calendar-sync-bar__feedback--error">✗</span>
          )}
          <button
            className="btn btn--secondary calendar-sync-bar__btn"
            onClick={handleSyncNow}
            disabled={syncing}
            aria-label={t('calendarSyncNow')}
          >
            {syncing ? t('calendarSyncing') : t('calendarSyncNow')}
          </button>
        </div>
      </div>

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
