import './AISummary.css'
import AppIcon from './AppIcon.jsx'
import { useI18n } from '../i18n.jsx'

/** Strip common markdown artefacts the AI might produce (bold, italic, headers). */
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .trim()
}

export default function AISummary({ text, priorities }) {
  const { t } = useI18n()

  const paragraphs = text
    ? stripMarkdown(text)
        .split(/\n+/)
        .map(l => l.trim())
        .filter(Boolean)
    : []

  return (
    <div className="ai-summary card">
      <div className="card__header">
        <span className="card__icon"><AppIcon name="briefing" className="icon" /></span>
        <span className="card__title">{t('briefingTitle')}</span>
      </div>
      {paragraphs.length > 0 && (
        <div className="ai-summary__text">
          {paragraphs.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
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
