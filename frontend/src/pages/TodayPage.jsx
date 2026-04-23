import DailySummary from '../components/DailySummary.jsx'
import QuickAddButton from '../components/QuickAddButton.jsx'
import { deleteEvent } from '../api.js'

export default function TodayPage({ summary, onAddSuccess }) {
  async function handleDeleteEvent(eventId) {
    try {
      await deleteEvent(eventId)
      if (onAddSuccess) onAddSuccess()
    } catch {
      // Silently ignore – the summary will stay as-is
    }
  }

  return (
    <>
      <DailySummary summary={summary} onDeleteEvent={handleDeleteEvent} />
      <QuickAddButton onSuccess={onAddSuccess} />
    </>
  )
}
