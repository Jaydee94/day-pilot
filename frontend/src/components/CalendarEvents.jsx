import { useState } from 'react'
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

function toDatetimeLocal(isoString) {
  const d = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const SOURCE_LABEL = {
  google: { label: 'Google', color: '#4285F4' },
  ical: { label: 'iCal', color: '#4285F4' },
  apple: { label: 'Apple', color: '#A3AAAE' },
}

/**
 * @param {{
 *   events: Array,
 *   onDeleteEvent?: (id: string) => void,
 *   onEditEvent?: (id: string, data: object) => Promise<void>
 * }} props
 */
export default function CalendarEvents({ events, onDeleteEvent, onEditEvent }) {
  const { t, locale } = useI18n()
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})

  function startEdit(ev) {
    setEditingId(ev.id)
    setEditValues({
      title: ev.title,
      start: toDatetimeLocal(ev.start),
      end: toDatetimeLocal(ev.end),
      location: ev.location || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValues({})
  }

  function update(field) {
    return (e) => setEditValues((v) => ({ ...v, [field]: e.target.value }))
  }

  async function handleSave(ev) {
    if (!onEditEvent) return
    const data = {
      title: editValues.title,
      start: new Date(editValues.start).toISOString(),
      end: new Date(editValues.end).toISOString(),
      location: editValues.location || null,
    }
    try {
      await onEditEvent(ev.id, data)
      setEditingId(null)
    } catch {
      // parent handles error display; keep form open
    }
  }

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
            const canDelete = ev.source === 'local' && typeof onDeleteEvent === 'function'
            const canEdit = ev.source === 'local' && typeof onEditEvent === 'function'
            const isEditing = editingId === ev.id

            return (
              <li
                key={ev.id}
                className={`cal-events__item${isEditing ? ' cal-events__item--editing' : ''}`}
              >
                {isEditing ? (
                  <form
                    className="cal-events__edit-form"
                    onSubmit={(e) => { e.preventDefault(); handleSave(ev) }}
                  >
                    <input
                      className="cal-events__edit-input"
                      value={editValues.title}
                      onChange={update('title')}
                      placeholder={t('title')}
                      required
                    />
                    <div className="cal-events__edit-row">
                      <input
                        type="datetime-local"
                        className="cal-events__edit-input"
                        value={editValues.start}
                        onChange={update('start')}
                        required
                      />
                      <input
                        type="datetime-local"
                        className="cal-events__edit-input"
                        value={editValues.end}
                        onChange={update('end')}
                        required
                      />
                    </div>
                    <input
                      className="cal-events__edit-input"
                      value={editValues.location}
                      onChange={update('location')}
                      placeholder={t('location')}
                    />
                    <div className="cal-events__edit-actions">
                      <button type="submit" className="btn cal-events__edit-save">
                        {t('saveChanges')}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary cal-events__edit-cancel"
                        onClick={cancelEdit}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="cal-events__time">
                      <span>{formatTime(ev.start, locale)}</span>
                      <span className="cal-events__time-end">{formatTime(ev.end, locale)}</span>
                    </div>
                    <div className="cal-events__content">
                      <span className="cal-events__title">{ev.title}</span>
                      {ev.location && (
                        <span className="cal-events__location">
                          <AppIcon name="mapPin" className="icon" /> {ev.location}
                        </span>
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
                        style={{ borderColor: src.color }}
                      >
                        {src.label}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          className="cal-events__edit-btn"
                          onClick={() => startEdit(ev)}
                          aria-label={t('editEvent')}
                          title={t('editEvent')}
                        >
                          <AppIcon name="pencil" className="cal-events__delete-icon" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="cal-events__delete"
                          onClick={() => onDeleteEvent(ev.id)}
                          aria-label={t('deleteEvent')}
                          title={t('deleteEvent')}
                        >
                          <AppIcon name="trash" className="cal-events__delete-icon" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
