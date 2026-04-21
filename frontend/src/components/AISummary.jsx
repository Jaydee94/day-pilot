import './AISummary.css'

export default function AISummary({ text, priorities }) {
  return (
    <div className="ai-summary card">
      <div className="card__header">
        <span className="card__icon">✈️</span>
        <span className="card__title">DayPilot Briefing</span>
      </div>
      {text && <p className="ai-summary__text">{text}</p>}
      {priorities?.length > 0 && (
        <div className="ai-summary__priorities">
          <p className="ai-summary__prio-label">Top Priorities</p>
          <ol className="ai-summary__prio-list">
            {priorities.map((p, i) => (
              <li key={i} className="ai-summary__prio-item">
                <span className="ai-summary__prio-num">{i + 1}</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
