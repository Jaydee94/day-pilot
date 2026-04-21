import './CalendarEvents.css'

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const SOURCE_LABEL = {
  google: { label: 'Google', color: '#4285F4' },
  apple: { label: 'Apple', color: '#A3AAAE' },
}

export default function CalendarEvents({ events }) {
  return (
    <div className="cal-events card">
      <div className="card__header">
        <span className="card__icon">📅</span>
        <span className="card__title">Events ({events.length})</span>
      </div>

      {events.length === 0 ? (
        <p className="card__empty">No events today</p>
      ) : (
        <ul className="cal-events__list">
          {events.map((ev) => {
            const src = SOURCE_LABEL[ev.source] || { label: ev.source, color: '#888' }
            return (
              <li key={ev.id} className="cal-events__item">
                <div className="cal-events__time">
                  <span>{formatTime(ev.start)}</span>
                  <span className="cal-events__time-end">{formatTime(ev.end)}</span>
                </div>
                <div className="cal-events__content">
                  <span className="cal-events__title">{ev.title}</span>
                  {ev.location && (
                    <span className="cal-events__location">📍 {ev.location}</span>
                  )}
                </div>
                <span
                  className="cal-events__source"
                  style={{ borderColor: src.color, color: src.color }}
                >
                  {src.label}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
