import { motion } from 'framer-motion'
import { AISummaryCard } from '@/components/feature/today/AISummaryCard'
import { WeatherCard } from '@/components/feature/today/WeatherCard'
import { TimePlanCard } from '@/components/feature/today/TimePlanCard'
import { TodayDoableCard } from '@/components/feature/today/TodayDoableCard'
import { BirthdaysCard } from '@/components/feature/today/BirthdaysCard'
import { EventsListCard } from '@/components/feature/today/EventsListCard'
import { TodosListCard } from '@/components/feature/today/TodosListCard'
import { QuickAddSheet } from '@/components/feature/today/QuickAddSheet'
import { completeTodo, deleteEvent, updateEvent } from '@/lib/api'
import type { CalendarEvent, DailySummary } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { useI18n } from '@/i18n.jsx'

interface Props {
  summary: DailySummary
  onAddSuccess?: () => void
}

const reveal = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.05, 0.7, 0.1, 1] },
  }),
}

export default function TodayPage({ summary, onAddSuccess }: Props): JSX.Element {
  const { locale } = useI18n()

  async function handleDeleteEvent(eventId: string): Promise<void> {
    await deleteEvent(eventId).catch(() => undefined)
    onAddSuccess?.()
  }

  async function handleEditEvent(_event: CalendarEvent): Promise<void> {
    // Inline editing happens in CalendarPage in this redesign — pass-through stub
    // to keep the Today list consistent with the Calendar page UX.
    await updateEvent(_event.id, _event).catch(() => undefined)
    onAddSuccess?.()
  }

  async function handleCompleteTodo(todoId: string): Promise<void> {
    await completeTodo(todoId).catch(() => undefined)
    onAddSuccess?.()
  }

  const sections: JSX.Element[] = []
  if (summary.ai_summary || summary.top_priorities?.length > 0) {
    sections.push(<AISummaryCard text={summary.ai_summary ?? undefined} priorities={summary.top_priorities ?? []} />)
  }
  sections.push(
    <TodayDoableCard events={summary.events || []} todos={summary.todos || []} weather={summary.weather ?? null} />,
  )
  if (summary.time_blocks?.length > 0) sections.push(<TimePlanCard timeBlocks={summary.time_blocks} />)
  sections.push(<WeatherCard weather={summary.weather ?? null} />)
  sections.push(<BirthdaysCard todayBirthdays={summary.birthdays || []} />)
  sections.push(
    <EventsListCard
      events={summary.events || []}
      onDelete={handleDeleteEvent}
      onEdit={handleEditEvent}
    />,
  )
  sections.push(<TodosListCard todos={summary.todos || []} onComplete={handleCompleteTodo} />)

  return (
    <>
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-label-md uppercase tracking-wider text-muted-foreground">
            {formatDate(summary.date, locale, { weekday: 'long' })}
          </p>
          <h1 className="text-display-sm text-foreground">
            {formatDate(summary.date, locale, { day: 'numeric', month: 'long', year: 'numeric' })}
          </h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Bento layout — AI briefing spans full width, then 2/3 + 1/3 columns */}
          {sections.map((node, i) => {
            // Spans tailored for a balanced bento:
            // 0: AI summary — full width
            // 1: Doable — 3 cols
            // 2: TimePlan or Weather — 3 cols
            // 3: Weather — 3 cols
            // 4: Birthdays — 3 cols
            // 5: Events — 3 cols
            // 6: Todos — 3 cols
            const span = i === 0 ? 'md:col-span-6' : 'md:col-span-3'
            return (
              <motion.div
                key={i}
                className={span}
                custom={i}
                initial="hidden"
                animate="show"
                variants={reveal}
              >
                {node}
              </motion.div>
            )
          })}
        </div>
      </div>
      <QuickAddSheet onSuccess={onAddSuccess} />
    </>
  )
}
