import './TodoList.css'
import AppIcon from './AppIcon.jsx'
import { useI18n } from '../i18n.jsx'

function formatDue(iso, locale) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export default function TodoList({ todos, onComplete }) {
  const { t, locale } = useI18n()
  const PRIORITY_MAP = {
    1: { label: t('priorityHigh'), color: 'var(--error)' },
    5: { label: t('priorityMedium'), color: 'var(--warning)' },
    9: { label: t('priorityLow'), color: 'var(--success)' },
  }

  const open = todos.filter((t) => !t.completed)
  const done = todos.filter((t) => t.completed)

  return (
    <div className="todo-list card">
      <div className="card__header">
        <span className="card__icon"><AppIcon name="tasks" className="icon" /></span>
        <span className="card__title">{t('tasksOpenCount', { count: open.length })}</span>
      </div>

      {open.length === 0 && done.length === 0 ? (
        <p className="card__empty">{t('noTasks')}</p>
      ) : (
        <ul className="todo-list__list">
          {open.map((item) => {
            const prio = PRIORITY_MAP[item.priority]
            return (
              <li key={item.id} className="todo-list__item">
                <button
                  type="button"
                  className="todo-list__checkbox todo-list__checkbox--open"
                  onClick={() => onComplete && onComplete(item.id)}
                  aria-label={t('completeTask')}
                  title={t('completeTask')}
                />
                <span className="todo-list__text">{item.title}</span>
                {item.recurrence && (
                  <span className="todo-list__recurrence">{t(`recurrence_${item.recurrence}`)}</span>
                )}
                {item.assigned_to && (
                  <span className="todo-list__assigned">{item.assigned_to}</span>
                )}
                {formatDue(item.due, locale) && (
                  <span className="todo-list__due">{formatDue(item.due, locale)}</span>
                )}
                {prio && (
                  <span
                    className="todo-list__prio"
                    style={{ color: prio.color }}
                  >
                    {prio.label}
                  </span>
                )}
              </li>
            )
          })}
          {done.map((item) => (
            <li key={item.id} className="todo-list__item todo-list__item--done">
              <span className="todo-list__checkbox todo-list__checkbox--done">✓</span>
              <span className="todo-list__text">{item.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
