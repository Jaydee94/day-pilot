import CalendarEvents from '../components/CalendarEvents.jsx'
import './Page.css'

export default function CalendarPage({ events }) {
  return (
    <div className="page">
      <h2 className="page__title">Calendar</h2>
      <p className="page__subtitle">All your events for today</p>
      <CalendarEvents events={events} />
    </div>
  )
}
