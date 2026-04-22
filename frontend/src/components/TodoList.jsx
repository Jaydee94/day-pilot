import './TodoList.css'
import AppIcon from './AppIcon.jsx'
import { useI18n } from '../i18n.jsx'

function formatDue(iso, locale) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export default function TodoList({ todos }) {
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
          {open.map((t) => {
            const prio = PRIORITY_MAP[t.priority]
            return (
              <li key={t.id} className="todo-list__item">
                <span className="todo-list__checkbox todo-list__checkbox--open" />
                <span className="todo-list__text">{t.title}</span>
                {formatDue(t.due, locale) && (
                  <span className="todo-list__due">{formatDue(t.due, locale)}</span>
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
          {done.map((t) => (
            <li key={t.id} className="todo-list__item todo-list__item--done">
              <span className="todo-list__checkbox todo-list__checkbox--done">✓</span>
              <span className="todo-list__text">{t.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
