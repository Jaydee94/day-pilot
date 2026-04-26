import { useI18n } from '../i18n.jsx'
import AppIcon from './AppIcon.jsx'
import './TimePlanCard.css'

const TYPE_ICONS = {
  focus: 'tasks',
  buffer: 'event',
  break: 'weather',
}

export default function TimePlanCard({ timeBlocks = [] }) {
  const { t } = useI18n()

  if (timeBlocks.length === 0) return null

  function typeLabel(type) {
    if (type === 'focus') return t('timePlanFocus')
    if (type === 'buffer') return t('timePlanBuffer')
    if (type === 'break') return t('timePlanBreak')
    return type
  }

  return (
    <div className="time-plan card">
      <div className="card__header">
        <span className="card__icon"><AppIcon name="event" className="icon" /></span>
        <span className="card__title">{t('timePlanTitle')}</span>
      </div>
      <ul className="time-plan__list">
        {timeBlocks.map((block, i) => (
          <li key={i} className={`time-plan__item time-plan__item--${block.type}`}>
            <span className="time-plan__slot">{block.start}–{block.end}</span>
            <span className="time-plan__task">{block.task}</span>
            <span className={`time-plan__badge time-plan__badge--${block.type}`}>
              {typeLabel(block.type)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
