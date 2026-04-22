import CalendarEvents from '../components/CalendarEvents.jsx'
import { useI18n } from '../i18n.jsx'
import './Page.css'

export default function CalendarPage({ events }) {
  const { t } = useI18n()

  return (
    <div className="page">
      <h2 className="page__title">{t('calendarTitle')}</h2>
      <p className="page__subtitle">{t('calendarSubtitle')}</p>
      <CalendarEvents events={events} />
    </div>
  )
}
