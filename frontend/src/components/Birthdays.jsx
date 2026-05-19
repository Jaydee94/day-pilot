import './Birthdays.css'
import AppIcon from './AppIcon.jsx'
import { useI18n } from '../i18n.jsx'

export default function Birthdays({ birthdays }) {
  const { t } = useI18n()

  return (
    <div className="birthdays card">
      <div className="card__header">
        <span className="card__icon"><AppIcon name="birthday" className="icon" /></span>
        <span className="card__title">{t('birthdaysToday')}</span>
      </div>
      <ul className="birthdays__list">
        {birthdays.map((b, i) => (
          <li key={`${b.name}-${b.date ?? ''}-${i}`} className="birthdays__item">
            <span className="birthdays__name">{b.name}</span>
            {b.age != null && (
              <span className="birthdays__age">{t('turnsAge', { age: b.age })}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
