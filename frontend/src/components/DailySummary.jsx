import Weather from './Weather.jsx'
import CalendarEvents from './CalendarEvents.jsx'
import TodoList from './TodoList.jsx'
import Birthdays from './Birthdays.jsx'
import AISummary from './AISummary.jsx'
import './DailySummary.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function DailySummary({ summary }) {
  return (
    <div className="daily-summary">
      <div className="daily-summary__date">{formatDate(summary.date)}</div>

      {/* Top row: AI summary */}
      {(summary.ai_summary || summary.top_priorities?.length > 0) && (
        <AISummary
          text={summary.ai_summary}
          priorities={summary.top_priorities}
        />
      )}

      {/* Grid: weather + birthdays */}
      <div className="daily-summary__row">
        <Weather weather={summary.weather} />
        {summary.birthdays?.length > 0 && (
          <Birthdays birthdays={summary.birthdays} />
        )}
      </div>

      {/* Full-width: events + todos */}
      <div className="daily-summary__grid">
        <CalendarEvents events={summary.events || []} />
        <TodoList todos={summary.todos || []} />
      </div>
    </div>
  )
}
