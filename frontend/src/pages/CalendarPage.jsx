import { useState, useEffect } from 'react'
import CalendarEvents from '../components/CalendarEvents.jsx'
import QuickAddButton from '../components/QuickAddButton.jsx'
import { fetchEvents, fetchSyncStatus, triggerSchedulerJob, deleteEvent } from '../api.js'
import { useI18n } from '../i18n.jsx'
import './Page.css'
import './CalendarPage.css'

/**
 * How long to wait (ms) after triggering a calendar sync before reloading
 * the events list. The sync job runs asynchronously in the backend so a small
 * delay is needed to allow it to complete before the client refetches.
 */
const SYNC_RELOAD_DELAY_MS = 2000

/** Format a UTC ISO timestamp as a short local date+time string. */
function formatLastSync(isoString, locale, neverSyncedLabel) {
  if (!isoString) return neverSyncedLabel
  const d = new Date(isoString)
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
      // Give the async sync job time to complete before reloading data
      setTimeout(async () => {
        await Promise.all([loadEvents(), loadSyncStatus()])
      }, SYNC_RELOAD_DELAY_MS)
    } catch {
      setSyncFeedback('error')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDeleteEvent(eventId) {
    try {
      await deleteEvent(eventId)
      await loadEvents()
    } catch {
      // Silently ignore – the event list will remain unchanged
    }
  }

  useEffect(() => {
    loadEvents()
    loadSyncStatus()
  }, [])

  return (
    <div className="page">
      <h2 className="page__title">{t('calendarTitle')}</h2>
      <p className="page__subtitle">{t('calendarSubtitle')}</p>

      <div className="calendar-sync-bar">
        <span className="calendar-sync-bar__status">
          {t('calendarLastSync', { time: formatLastSync(lastSync, locale, t('calendarNeverSynced')) })}
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
      {!loading && !error && <CalendarEvents events={events} onDeleteEvent={handleDeleteEvent} />}
      <QuickAddButton defaultTab="Event" onSuccess={loadEvents} />
    </div>
  )
}
