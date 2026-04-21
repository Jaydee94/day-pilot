import './Birthdays.css'

export default function Birthdays({ birthdays }) {
  return (
    <div className="birthdays card">
      <div className="card__header">
        <span className="card__icon">🎂</span>
        <span className="card__title">Geburtstage heute</span>
      </div>
      <ul className="birthdays__list">
        {birthdays.map((b, i) => (
          <li key={i} className="birthdays__item">
            <span className="birthdays__name">{b.name}</span>
            {b.age != null && (
              <span className="birthdays__age">wird {b.age}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
