import './TodoList.css'

const PRIORITY_MAP = {
  1: { label: 'Hoch', color: 'var(--error)' },
  5: { label: 'Mittel', color: 'var(--warning)' },
  9: { label: 'Niedrig', color: 'var(--success)' },
}

function formatDue(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export default function TodoList({ todos }) {
  const open = todos.filter((t) => !t.completed)
  const done = todos.filter((t) => t.completed)

  return (
    <div className="todo-list card">
      <div className="card__header">
        <span className="card__icon">✅</span>
        <span className="card__title">Aufgaben ({open.length} offen)</span>
      </div>

      {open.length === 0 && done.length === 0 ? (
        <p className="card__empty">Keine Aufgaben</p>
      ) : (
        <ul className="todo-list__list">
          {open.map((t) => {
            const prio = PRIORITY_MAP[t.priority]
            return (
              <li key={t.id} className="todo-list__item">
                <span className="todo-list__checkbox todo-list__checkbox--open" />
                <span className="todo-list__text">{t.title}</span>
                {formatDue(t.due) && (
                  <span className="todo-list__due">{formatDue(t.due)}</span>
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
