import { useState, useEffect, useRef } from 'react'
import CalendarEvents from '../components/CalendarEvents.jsx'
import QuickAddButton from '../components/QuickAddButton.jsx'
import { fetchEvents, fetchSyncStatus, triggerSchedulerJob, deleteEvent, updateEvent, fetchFamilyMembers } from '../api'
import MemberFilter from '../components/MemberFilter.jsx'
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
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const timersRef = useRef(new Set())

  useEffect(() => {
    fetchFamilyMembers()
      .then(setMembers)
      .catch(err => console.error('fetchFamilyMembers failed:', err))
  }, [])

  // Clear any pending timeouts on unmount to avoid setState-on-unmounted warnings.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach(id => clearTimeout(id))
      timers.clear()
    }
  }, [])

  function scheduleTimeout(fn, ms) {
    const id = setTimeout(() => {
      timersRef.current.delete(id)
      fn()
    }, ms)
    timersRef.current.add(id)
    return id
  }

  async function loadEvents() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchEvents(selectedMember)
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
      scheduleTimeout(() => {
        Promise.all([loadEvents(), loadSyncStatus()]).catch(err =>
          console.error('Sync reload failed:', err),
        )
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
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleEditEvent(eventId, data) {
    try {
      await updateEvent(eventId, data)
      await loadEvents()
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadEvents()
    loadSyncStatus()
  }, [selectedMember])

  return (
    <div className="page">
      <h2 className="page__title">{t('calendarTitle')}</h2>
      <p className="page__subtitle">{t('calendarSubtitle')}</p>

      <MemberFilter members={members} selected={selectedMember} onChange={setSelectedMember} />

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
      {!loading && !error && <CalendarEvents events={events} onDeleteEvent={handleDeleteEvent} onEditEvent={handleEditEvent} />}
      <QuickAddButton defaultTab="Event" onSuccess={loadEvents} />
    </div>
  )
}
