import Weather from './Weather.jsx'
import CalendarEvents from './CalendarEvents.jsx'
import TodoList from './TodoList.jsx'
import Birthdays from './Birthdays.jsx'
import UpcomingBirthdays from './UpcomingBirthdays.jsx'
import AISummary from './AISummary.jsx'
import { useI18n } from '../i18n.jsx'
import './DailySummary.css'

function formatDate(iso, locale) {
  const d = new Date(iso)
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** @param {{ summary: object, onDeleteEvent?: (id: string) => void }} props */
export default function DailySummary({ summary, onDeleteEvent }) {
  const { locale } = useI18n()

  return (
    <div className="daily-summary">
      <div className="daily-summary__date">{formatDate(summary.date, locale)}</div>

      {/* Top row: AI summary */}
      {(summary.ai_summary || summary.top_priorities?.length > 0) && (
        <AISummary
          text={summary.ai_summary}
          priorities={summary.top_priorities}
        />
      )}

      {/* Grid: weather + today's birthdays */}
      <div className="daily-summary__row">
        <div className="daily-summary__weather-col">
          <Weather weather={summary.weather} />
        </div>
        {summary.birthdays?.length > 0 && (
          <Birthdays birthdays={summary.birthdays} />
        )}
      </div>

      {/* Upcoming birthdays panel */}
      <UpcomingBirthdays />

      {/* Full-width: events + todos */}
      <div className="daily-summary__grid">
        <CalendarEvents events={summary.events || []} onDeleteEvent={onDeleteEvent} />
        <TodoList todos={summary.todos || []} />
      </div>
    </div>
  )
}
