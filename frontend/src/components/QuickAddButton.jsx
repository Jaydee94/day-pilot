import { Link } from 'react-router-dom'
import { useState } from 'react'
import './QuickAddButton.css'

export default function QuickAddButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="quick-add-btn"
        onClick={() => setOpen(true)}
        title="Quick Add"
        aria-label="Quick add event or task"
      >
        +
      </button>

      {open && (
        <div className="quick-add-overlay" onClick={() => setOpen(false)}>
          <div
            className="quick-add-modal card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="quick-add-modal__header">
              <h2 className="quick-add-modal__title">Quick Add</h2>
              <button
                className="quick-add-modal__close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="quick-add-modal__hint">
              Use voice commands or connect Google Calendar to add events.
              See the{' '}
              <Link to="/settings">Settings</Link> page for setup instructions.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
