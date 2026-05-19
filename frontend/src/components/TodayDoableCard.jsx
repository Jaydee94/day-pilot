import { useMemo, useState } from 'react'
import AppIcon from './AppIcon.jsx'
import { useI18n } from '../i18n.jsx'
import './TodayDoableCard.css'

const ENERGY_LEVELS = ['high', 'medium', 'low']
const OUTDOOR_KEYWORDS = ['walk', 'run', 'bike', 'garden', 'outside', 'spazier', 'laufen', 'rad', 'garten', 'draussen']
const DAY_START_HOUR = 8
const DAY_END_HOUR = 20

function isOutdoorTask(title) {
  const normalized = title.toLowerCase()
  return OUTDOOR_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function formatSlot(start, end, locale) {
  const startLabel = start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const endLabel = end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return `${startLabel}–${endLabel}`
}

function getGapWindows(events, dayStart, dayEnd) {
  const sorted = [...events]
    .map((event) => ({ ...event, startDate: new Date(event.start), endDate: new Date(event.end) }))
    .sort((a, b) => a.startDate - b.startDate)

  const windows = []
  let cursor = dayStart

  sorted.forEach((event) => {
    const eventStart = event.startDate
    const eventEnd = event.endDate
    if (eventEnd <= dayStart || eventStart >= dayEnd) return

    const boundedStart = new Date(Math.max(eventStart.getTime(), dayStart.getTime()))
    const boundedEnd = new Date(Math.min(eventEnd.getTime(), dayEnd.getTime()))

    if (boundedStart > cursor) {
      windows.push({ start: new Date(cursor), end: boundedStart })
    }

    if (boundedEnd > cursor) {
      cursor = boundedEnd
    }
  })

  if (cursor < dayEnd) {
    windows.push({ start: new Date(cursor), end: dayEnd })
  }

  return windows
}

function pickTask(todos, energy, rainy) {
  const openTodos = todos.filter((todo) => !todo.completed)
  const sorted = openTodos.sort((a, b) => {
    const priorityA = a.priority ?? 9
    const priorityB = b.priority ?? 9
    if (priorityA !== priorityB) return priorityA - priorityB

    if (a.due && b.due) return new Date(a.due) - new Date(b.due)
    if (a.due) return -1
    if (b.due) return 1
    return a.title.localeCompare(b.title)
  })

  const filtered = sorted.filter((todo) => {
    if (rainy && isOutdoorTask(todo.title)) return false
    if (energy === 'low' && (todo.priority ?? 9) <= 3) return false
    return true
  })

  return filtered[0] ?? sorted[0] ?? null
}

function hasRainConflict(weather) {
  const hourly = weather?.hourly_forecast || []
  return hourly.some((point) => (point.chance_of_rain ?? 0) >= 60)
}

/**
 * @param {{ events: Array<object>, todos: Array<object>, weather: object | null }} props
 */
export default function TodayDoableCard({ events = [], todos = [], weather = null }) {
  const { t, locale } = useI18n()
  const [energy, setEnergy] = useState('medium')

  const suggestions = useMemo(() => {
    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(DAY_START_HOUR, 0, 0, 0)
    const dayEnd = new Date(now)
    dayEnd.setHours(DAY_END_HOUR, 0, 0, 0)

    const gaps = getGapWindows(events, dayStart, dayEnd)
      .map((window) => ({
        ...window,
        durationMinutes: Math.floor((window.end - window.start) / (1000 * 60)),
      }))
      .filter((window) => window.durationMinutes >= 20)
      .sort((a, b) => b.durationMinutes - a.durationMinutes)

    const rainy = hasRainConflict(weather)
    const nextTask = pickTask(todos, energy, rainy)
    const nextEvent = [...events]
      .map((event) => ({ ...event, startDate: new Date(event.start) }))
      .filter((event) => event.startDate > now)
      .sort((a, b) => a.startDate - b.startDate)[0]

    const actionable = []

    if (nextTask) {
      if (gaps.length > 0) {
        actionable.push(
          t('doableTaskWithSlot', {
            task: nextTask.title,
            slot: formatSlot(gaps[0].start, gaps[0].end, locale),
          }),
        )
      } else {
        actionable.push(t('doableTaskQuickWin', { task: nextTask.title }))
      }
    } else {
      actionable.push(t('doableNoTasks'))
    }

    if (rainy) {
      actionable.push(t('doableRainHint'))
    } else {
      actionable.push(t('doableWeatherGood'))
    }

    if (nextEvent) {
      const bufferStart = new Date(nextEvent.startDate.getTime() - 15 * 60 * 1000)
      actionable.push(
        t('doableBufferHint', {
          time: bufferStart.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
        }),
      )
    } else {
      actionable.push(t('doableNoUpcomingEvents'))
    }

    return actionable.slice(0, 3)
  }, [energy, events, locale, t, todos, weather])

  return (
    <section className="card doable-card" aria-label={t('doableTitle')}>
      <div className="card__header">
        <span className="card__icon" aria-hidden="true"><AppIcon name="briefing" /></span>
        <h2 className="card__title">{t('doableTitle')}</h2>
      </div>

      <p className="doable-card__subtitle">{t('doableSubtitle')}</p>

      <div className="doable-card__energy" role="group" aria-label={t('doableEnergyLabel')}>
        {ENERGY_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            className={`doable-card__chip ${energy === level ? 'doable-card__chip--active' : ''}`}
            onClick={() => setEnergy(level)}
            aria-label={t(`doableEnergy${level[0].toUpperCase()}${level.slice(1)}`)}
          >
            {t(`doableEnergy${level[0].toUpperCase()}${level.slice(1)}`)}
          </button>
        ))}
      </div>

      <ol className="doable-card__list">
        {suggestions.map((item) => (
          <li key={item} className="doable-card__item">{item}</li>
        ))}
      </ol>
    </section>
  )
}
