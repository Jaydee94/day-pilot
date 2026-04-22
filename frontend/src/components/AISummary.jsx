import './AISummary.css'
import AppIcon from './AppIcon.jsx'
import { useI18n } from '../i18n.jsx'

export default function AISummary({ text, priorities }) {
  const { t } = useI18n()

  return (
    <div className="ai-summary card">
      <div className="card__header">
        <span className="card__icon"><AppIcon name="briefing" className="icon" /></span>
        <span className="card__title">{t('briefingTitle')}</span>
      </div>
      {text && <p className="ai-summary__text">{text}</p>}
      {priorities?.length > 0 && (
        <div className="ai-summary__priorities">
          <p className="ai-summary__prio-label">{t('topPriorities')}</p>
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
