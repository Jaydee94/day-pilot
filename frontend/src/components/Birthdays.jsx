import './Birthdays.css'
import AppIcon from './AppIcon.jsx'

export default function Birthdays({ birthdays }) {
  return (
    <div className="birthdays card">
      <div className="card__header">
        <span className="card__icon"><AppIcon name="birthday" className="icon" /></span>
        <span className="card__title">Birthdays Today</span>
      </div>
      <ul className="birthdays__list">
        {birthdays.map((b, i) => (
          <li key={i} className="birthdays__item">
            <span className="birthdays__name">{b.name}</span>
            {b.age != null && (
              <span className="birthdays__age">turns {b.age}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
