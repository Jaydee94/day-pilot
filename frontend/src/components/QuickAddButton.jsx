import { useState } from 'react'
import './QuickAddButton.css'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const TABS = ['Event', 'Task']

function toLocalDateTimeInput(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes())
  )
}

export default function QuickAddButton({ onSuccess }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('Event')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Event form state
  const [eventTitle, setEventTitle] = useState('')
  const [eventStart, setEventStart] = useState(toLocalDateTimeInput())
  const [eventEnd, setEventEnd] = useState('')
  const [eventLocation, setEventLocation] = useState('')

  // Task form state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')

  function handleClose() {
    setOpen(false)
    setError(null)
    setSuccess(false)
    setEventTitle('')
    setEventStart(toLocalDateTimeInput())
    setEventEnd('')
    setEventLocation('')
    setTaskTitle('')
    setTaskDue('')
    setTab('Event')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (tab === 'Event') {
        const body = {
          title: eventTitle,
          start: new Date(eventStart).toISOString(),
        }
        if (eventEnd) body.end = new Date(eventEnd).toISOString()
        if (eventLocation) body.location = eventLocation

        const resp = await fetch(`${API_BASE}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}))
          throw new Error(data.detail || `HTTP ${resp.status}`)
        }
      } else {
        const body = { title: taskTitle }
        if (taskDue) body.due = new Date(taskDue).toISOString()

        const resp = await fetch(`${API_BASE}/todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}))
          throw new Error(data.detail || `HTTP ${resp.status}`)
        }
      }

      setSuccess(true)
      if (onSuccess) onSuccess()
      setTimeout(handleClose, 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        className="quick-add-btn"
        onClick={() => setOpen(true)}
        title="Quick Add"
        aria-label="Quick add event or task"
      >
        +
      </button>

      {open && (
        <div className="quick-add-overlay" onClick={handleClose}>
          <div
            className="quick-add-modal card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="quick-add-modal__header">
              <h2 className="quick-add-modal__title">Quick Add</h2>
              <button
                className="quick-add-modal__close"
                onClick={handleClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="quick-add-modal__tabs">
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`quick-add-tab${tab === t ? ' quick-add-tab--active' : ''}`}
                  onClick={() => { setTab(t); setError(null) }}
                  type="button"
                >
                  {t === 'Event' ? '📅' : '✅'} {t}
                </button>
              ))}
            </div>

            {success ? (
              <div className="quick-add-modal__success">
                ✓ {tab} added successfully!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="quick-add-form">
                {tab === 'Event' ? (
                  <>
                    <label className="quick-add-label">
                      Title *
                      <input
                        className="quick-add-input"
                        type="text"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="e.g. Doctor appointment"
                        required
                        autoFocus
                      />
                    </label>
                    <label className="quick-add-label">
                      Start *
                      <input
                        className="quick-add-input"
                        type="datetime-local"
                        value={eventStart}
                        onChange={(e) => setEventStart(e.target.value)}
                        required
                      />
                    </label>
                    <label className="quick-add-label">
                      End
                      <input
                        className="quick-add-input"
                        type="datetime-local"
                        value={eventEnd}
                        onChange={(e) => setEventEnd(e.target.value)}
                      />
                    </label>
                    <label className="quick-add-label">
                      Location
                      <input
                        className="quick-add-input"
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="e.g. City Hospital"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="quick-add-label">
                      Task *
                      <input
                        className="quick-add-input"
                        type="text"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="e.g. Buy groceries"
                        required
                        autoFocus
                      />
                    </label>
                    <label className="quick-add-label">
                      Due date
                      <input
                        className="quick-add-input"
                        type="datetime-local"
                        value={taskDue}
                        onChange={(e) => setTaskDue(e.target.value)}
                      />
                    </label>
                  </>
                )}

                {error && (
                  <p className="quick-add-error">⚠️ {error}</p>
                )}

                <button
                  className="quick-add-submit btn"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Saving…' : `Add ${tab}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
