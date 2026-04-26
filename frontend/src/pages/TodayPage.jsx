import DailySummary from '../components/DailySummary.jsx'
import QuickAddButton from '../components/QuickAddButton.jsx'
import { deleteEvent, updateEvent, completeTodo } from '../api.js'

export default function TodayPage({ summary, onAddSuccess }) {
  async function handleDeleteEvent(eventId) {
    try {
      await deleteEvent(eventId)
      if (onAddSuccess) onAddSuccess()
    } catch (err) {
      console.error('Failed to delete event:', err)
    }
  }

  async function handleEditEvent(eventId, data) {
    try {
      await updateEvent(eventId, data)
      if (onAddSuccess) onAddSuccess()
    } catch (err) {
      console.error('Failed to update event:', err)
    }
  }

  async function handleCompleteTodo(todoId) {
    try {
      await completeTodo(todoId)
      if (onAddSuccess) onAddSuccess()
    } catch (err) {
      console.error('Failed to complete todo:', err)
    }
  }

  return (
    <>
      <DailySummary
        summary={summary}
        onDeleteEvent={handleDeleteEvent}
        onEditEvent={handleEditEvent}
        onCompleteTodo={handleCompleteTodo}
      />
      <QuickAddButton onSuccess={onAddSuccess} />
    </>
  )
}
