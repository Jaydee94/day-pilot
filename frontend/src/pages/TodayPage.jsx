import DailySummary from '../components/DailySummary.jsx'
import QuickAddButton from '../components/QuickAddButton.jsx'

export default function TodayPage({ summary, onAddSuccess }) {
  return (
    <>
      <DailySummary summary={summary} />
      <QuickAddButton onSuccess={onAddSuccess} />
    </>
  )
}
