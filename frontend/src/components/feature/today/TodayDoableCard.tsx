import { useMemo, useState } from 'react'
import { Wand2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { CalendarEvent, TodoItem, WeatherInfo } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n.jsx'

type Energy = 'low' | 'medium' | 'high'

const ENERGY_LEVELS: Energy[] = ['low', 'medium', 'high']

const OUTDOOR_KEYWORDS = [
  'walk',
  'run',
  'bike',
  'garden',
  'outside',
  'spazier',
  'laufen',
  'rad',
  'garten',
  'draussen',
]

const DAY_START_HOUR = 8
const DAY_END_HOUR = 20

interface Props {
  events: CalendarEvent[]
  todos: TodoItem[]
  weather?: WeatherInfo | null
}

function isOutdoorTask(title: string): boolean {
  const n = title.toLowerCase()
  return OUTDOOR_KEYWORDS.some(k => n.includes(k))
}

function formatSlot(start: Date, end: Date, locale: string): string {
  const f = (d: Date) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return `${f(start)}–${f(end)}`
}

function getGapWindows(events: CalendarEvent[], dayStart: Date, dayEnd: Date) {
  const sorted = [...events]
    .map(e => ({ ...e, startDate: new Date(e.start), endDate: new Date(e.end) }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  const windows: { start: Date; end: Date }[] = []
  let cursor = dayStart

  sorted.forEach(event => {
    if (event.endDate <= dayStart || event.startDate >= dayEnd) return
    const boundedStart = new Date(Math.max(event.startDate.getTime(), dayStart.getTime()))
    const boundedEnd = new Date(Math.min(event.endDate.getTime(), dayEnd.getTime()))
    if (boundedStart > cursor) windows.push({ start: new Date(cursor), end: boundedStart })
    if (boundedEnd > cursor) cursor = boundedEnd
  })

  if (cursor < dayEnd) windows.push({ start: new Date(cursor), end: dayEnd })
  return windows
}

function pickTask(todos: TodoItem[], energy: Energy, rainy: boolean): TodoItem | null {
  const open = todos.filter(t => !t.completed)
  const sorted = [...open].sort((a, b) => {
    const pa = a.priority ?? 9
    const pb = b.priority ?? 9
    if (pa !== pb) return pa - pb
    if (a.due && b.due) return new Date(a.due).getTime() - new Date(b.due).getTime()
    if (a.due) return -1
    if (b.due) return 1
    return a.title.localeCompare(b.title)
  })
  const filtered = sorted.filter(todo => {
    if (rainy && isOutdoorTask(todo.title)) return false
    if (energy === 'low' && (todo.priority ?? 9) <= 3) return false
    return true
  })
  return filtered[0] ?? sorted[0] ?? null
}

export function TodayDoableCard({ events, todos, weather }: Props): JSX.Element {
  const { t, locale } = useI18n()
  const [energy, setEnergy] = useState<Energy>('medium')

  const suggestions = useMemo(() => {
    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(DAY_START_HOUR, 0, 0, 0)
    const dayEnd = new Date(now)
    dayEnd.setHours(DAY_END_HOUR, 0, 0, 0)

    const gaps = getGapWindows(events, dayStart, dayEnd)
      .map(w => ({ ...w, durationMinutes: Math.floor((w.end.getTime() - w.start.getTime()) / 60000) }))
      .filter(w => w.durationMinutes >= 20)
      .sort((a, b) => b.durationMinutes - a.durationMinutes)

    const rainy = (weather?.hourly_forecast || []).some(p => (p.chance_of_rain ?? 0) >= 60)
    const nextTask = pickTask(todos, energy, rainy)
    const nextEvent = [...events]
      .map(e => ({ ...e, startDate: new Date(e.start) }))
      .filter(e => e.startDate > now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]

    const out: string[] = []
    if (nextTask) {
      if (gaps[0]) {
        out.push(t('doableTaskWithSlot', { task: nextTask.title, slot: formatSlot(gaps[0].start, gaps[0].end, locale) }))
      } else {
        out.push(t('doableTaskQuickWin', { task: nextTask.title }))
      }
    } else {
      out.push(t('doableNoTasks'))
    }
    out.push(rainy ? t('doableRainHint') : t('doableWeatherGood'))
    if (nextEvent) {
      const buffer = new Date(nextEvent.startDate.getTime() - 15 * 60 * 1000)
      out.push(t('doableBufferHint', { time: buffer.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) }))
    } else {
      out.push(t('doableNoUpcomingEvents'))
    }
    return out.slice(0, 3)
  }, [energy, events, locale, t, todos, weather])

  return (
    <Card variant="elevated" className="bg-secondary-container/40">
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            <h2 className="text-title-lg">{t('doableTitle')}</h2>
          </div>
          <p className="text-body-md text-muted-foreground">{t('doableSubtitle')}</p>
        </div>

        <div role="group" aria-label={t('doableEnergyLabel')} className="flex gap-2 flex-wrap">
          {ENERGY_LEVELS.map(level => {
            const active = energy === level
            const labelKey = `doableEnergy${level[0]!.toUpperCase()}${level.slice(1)}`
            return (
              <button
                key={level}
                type="button"
                onClick={() => setEnergy(level)}
                aria-pressed={active}
                className={cn(
                  'state-layer h-9 px-4 rounded-full text-label-md transition-colors duration-short3',
                  active
                    ? 'bg-primary text-primary-foreground shadow-elev1'
                    : 'bg-surface-container text-foreground border border-outline',
                )}
              >
                {t(labelKey)}
              </button>
            )
          })}
        </div>

        <ol className="space-y-2">
          {suggestions.map((s, i) => (
            <li
              key={`${i}-${s.slice(0, 16)}`}
              className="flex items-start gap-3 rounded-xl bg-surface-container px-4 py-3 text-body-md text-foreground"
            >
              <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-container text-primary-container-foreground text-label-md font-semibold">
                {i + 1}
              </span>
              <span className="flex-1 leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
