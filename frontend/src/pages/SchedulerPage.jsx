import { useState, useEffect, useCallback } from 'react'
import { fetchSchedulerJobs, triggerSchedulerJob } from '../api.js'
import { useI18n } from '../i18n.jsx'
import './SchedulerPage.css'

/** Human-readable display names per job ID */
const JOB_DISPLAY = {
  daily_summary: 'Daily Briefing',
  calendar_sync: 'Calendar Sync',
  weather_cache_refresh: 'Weather Refresh',
}

/** Icons per job ID (SVG inline) */
function JobIcon({ jobId }) {
  if (jobId === 'daily_summary') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )
  }
  if (jobId === 'calendar_sync') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <polyline points="17 14 12 14 12 19" />
      </svg>
    )
  }
  if (jobId === 'weather_cache_refresh') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  )
}

/** Format seconds into HH:MM:SS or "< 1 min" */
function formatCountdown(seconds) {
  if (seconds == null || seconds < 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

/** Format a next_run ISO string to a readable local time */
function formatNextRun(isoString, locale, unknownLabel) {
  if (!isoString) return unknownLabel
  const d = new Date(isoString)
  return d.toLocaleString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function JobCard({ job, onTrigger }) {
  const { t, locale } = useI18n()
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [triggering, setTriggering] = useState(false)
  const [triggered, setTriggered] = useState(false)

  // Recalculate countdown every second
  useEffect(() => {
    if (!job.next_run) return

    const tick = () => {
      const diff = Math.round((new Date(job.next_run) - Date.now()) / 1000)
      setSecondsLeft(diff > 0 ? diff : 0)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [job.next_run])

  const handleTrigger = async () => {
    setTriggering(true)
    try {
      await onTrigger(job.id)
      setTriggered(true)
      setTimeout(() => setTriggered(false), 3000)
    } finally {
      setTriggering(false)
    }
  }

  const urgency =
    secondsLeft != null && secondsLeft < 120
      ? 'scheduler-job__countdown--soon'
      : ''

  return (
    <div className="scheduler-job card">
      <div className="scheduler-job__header">
        <span className="scheduler-job__icon" aria-hidden="true">
          <JobIcon jobId={job.id} />
        </span>
        <div className="scheduler-job__meta">
          <h3 className="scheduler-job__name">{JOB_DISPLAY[job.id] ?? job.name}</h3>
          <p className="scheduler-job__desc">{job.description}</p>
        </div>
      </div>

      <div className="scheduler-job__body">
        <div className="scheduler-job__row">
          <span className="scheduler-job__label">{t('schedulerTrigger')}</span>
          <code className="scheduler-job__trigger">{job.trigger}</code>
        </div>
        <div className="scheduler-job__row">
          <span className="scheduler-job__label">{t('schedulerNextRun')}</span>
          <span className="scheduler-job__value">{formatNextRun(job.next_run, locale, t('unknown'))}</span>
        </div>
        <div className={`scheduler-job__countdown ${urgency}`} aria-live="polite">
          <span className="scheduler-job__countdown-label">in</span>
          <span className="scheduler-job__countdown-value">
            {formatCountdown(secondsLeft)}
          </span>
        </div>
      </div>

      <div className="scheduler-job__footer">
        {triggered && (
          <span className="scheduler-job__feedback">{t('schedulerStarted')} ✓</span>
        )}
        <button
          className="btn scheduler-job__btn"
          onClick={handleTrigger}
          disabled={triggering}
          aria-label={`${JOB_DISPLAY[job.id] ?? job.name} ${t('schedulerRunNow')}`}
        >
          {triggering ? t('schedulerStarting') : t('schedulerRunNow')}
        </button>
      </div>
    </div>
  )
}

export default function SchedulerPage() {
  const { t } = useI18n()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadJobs = useCallback(async () => {
    try {
      const data = await fetchSchedulerJobs()
      setJobs(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + poll every 30s to keep next_run in sync after jobs fire
  useEffect(() => {
    loadJobs()
    const id = setInterval(loadJobs, 30_000)
    return () => clearInterval(id)
  }, [loadJobs])

  const handleTrigger = async (jobId) => {
    await triggerSchedulerJob(jobId)
    // Reload job list after a short delay so next_run reflects the re-schedule
    setTimeout(loadJobs, 1500)
  }

  return (
    <div className="scheduler-page">
      <div className="scheduler-page__header">
        <h2 className="scheduler-page__title">{t('schedulerTitle')}</h2>
        <p className="scheduler-page__subtitle">
          {t('schedulerSubtitle')}
        </p>
        <button
          className="btn btn--secondary scheduler-page__refresh"
          onClick={loadJobs}
          disabled={loading}
          aria-label={t('schedulerRefresh')}
        >
          {t('schedulerRefresh')}
        </button>
      </div>

      {loading && jobs.length === 0 && (
        <div className="loading-state">
          <div className="spinner" />
          <p>{t('schedulerLoading')}</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <span>⚠️</span>
          <p>{t('schedulerError', { error })}</p>
          <button className="btn" onClick={loadJobs}>{t('schedulerRetry')}</button>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="scheduler-page__empty">
          <p>{t('schedulerEmpty')}</p>
        </div>
      )}

      <div className="scheduler-page__grid">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onTrigger={handleTrigger} />
        ))}
      </div>
    </div>
  )
}
