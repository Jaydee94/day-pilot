import './AISummary.css'
import AppIcon from './AppIcon.jsx'
import { useI18n } from '../i18n.jsx'

/** Strip markdown and any raw FORMAT sections the AI leaked into the summary. */
function cleanSummaryText(text) {
  let t = text
  // Remove everything from PRIORITIES: or TIME_BLOCKS: onwards (defensive strip)
  t = t.split(/\n?PRIORITIES:/)[0]
  t = t.split(/\n?TIME_BLOCKS:/)[0]
  // Remove markdown
  t = t
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
  return t.trim()
}

export default function AISummary({ text, priorities }) {
  const { t } = useI18n()

  const paragraphs = text
    ? cleanSummaryText(text)
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
            <p key={`${i}-${line.slice(0, 20)}`}>{line}</p>
          ))}
        </div>
      )}
      {priorities?.length > 0 && (
        <div className="ai-summary__priorities">
          <p className="ai-summary__prio-label">{t('topPriorities')}</p>
          <ol className="ai-summary__prio-list">
            {priorities.map((p, i) => (
              <li key={`${i}-${String(p).slice(0, 20)}`} className="ai-summary__prio-item">
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
