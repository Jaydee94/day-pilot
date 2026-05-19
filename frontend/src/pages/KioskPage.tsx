import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, Cake, Cloud, ListTodo, Sparkles } from 'lucide-react'
import { API_BASE } from '@/lib/api'
import type { DailySummary } from '@/lib/types'
import { formatDate, formatTime } from '@/lib/utils'
import { useI18n } from '@/i18n.jsx'

function formatClock(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Bento-grid full-screen view for wall-mounted displays.
 * Auto-refreshes every `?refresh=<seconds>` (default 300s).
 */
export default function KioskPage(): JSX.Element {
  const { t, locale } = useI18n()
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [clock, setClock] = useState(new Date())
  const [error, setError] = useState<string | null>(null)

  const refreshSec = parseInt(new URLSearchParams(window.location.search).get('refresh') || '300', 10)

  async function loadSummary(): Promise<void> {
    try {
      const resp = await fetch(`${API_BASE}/summary`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      setSummary((await resp.json()) as DailySummary)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    loadSummary()
    const interval = setInterval(loadSummary, refreshSec * 1000)
    return () => clearInterval(interval)
  }, [refreshSec])

  const events = summary?.events ?? []
  const todos = (summary?.todos ?? []).filter(t => !t.completed)
  const weather = summary?.weather
  const briefing = summary?.ai_summary
  const birthdays = summary?.birthdays ?? []

  return (
    <div className="bg-app min-h-screen min-h-dvh p-6 lg:p-10 text-foreground">
      {/* Top bar: date + clock + weather */}
      <header className="grid grid-cols-3 items-end pb-6">
        <div>
          {summary && (
            <p className="text-display-sm text-foreground">
              {formatDate(summary.date, locale, { weekday: 'long' })}
            </p>
          )}
          {summary && (
            <p className="text-headline-md text-muted-foreground">
              {formatDate(summary.date, locale, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="text-center">
          <span className="text-display-lg tabular-nums tracking-tight text-foreground">
            {formatClock(clock, locale)}
          </span>
        </div>
        <div className="text-right">
          {weather ? (
            <div className="inline-flex items-center gap-3 text-headline-sm text-foreground">
              <Cloud className="w-7 h-7 text-tertiary" />
              <span>
                {Math.round(weather.temperature)}
                {weather.units === 'metric' ? '°C' : '°F'}
              </span>
              <span className="text-body-lg text-muted-foreground capitalize">{weather.description}</span>
              <span className="text-body-lg text-muted-foreground">· {weather.city}</span>
            </div>
          ) : (
            <span className="text-body-lg text-muted-foreground">{t('weatherUnavailable')}</span>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-4 flex items-center gap-3 bg-error-container text-error-container-foreground rounded-2xl px-5 py-3">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Bento grid */}
      <main className="grid grid-cols-12 grid-rows-6 gap-5 h-[calc(100vh-180px)] min-h-[600px]">
        {/* AI Briefing — large left card */}
        <section className="col-span-7 row-span-3 rounded-3xl bg-primary-container text-primary-container-foreground p-7 shadow-elev1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-6 h-6" />
            <h2 className="text-title-lg">{t('briefingTitle')}</h2>
          </div>
          <p className="text-headline-sm leading-snug flex-1 overflow-hidden">
            {briefing ? briefing.split(/\n?PRIORITIES:|\n?TIME_BLOCKS:/)[0]?.trim() : t('loadingSummary')}
          </p>
        </section>

        {/* Events — top right */}
        <section className="col-span-5 row-span-3 rounded-3xl bg-surface-container p-6 shadow-elev1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-6 h-6 text-primary" />
            <h2 className="text-title-lg">{t('kioskEventsSection')}</h2>
          </div>
          {events.length === 0 ? (
            <p className="text-body-lg text-muted-foreground">{t('noEventsToday')}</p>
          ) : (
            <ul className="space-y-2 overflow-y-auto pr-1 no-scrollbar">
              {events.slice(0, 6).map(ev => (
                <li key={ev.id} className="flex items-center gap-4 rounded-xl bg-surface-container-high px-4 py-3">
                  <span className="text-title-md tabular-nums text-primary w-24">
                    {formatTime(ev.start, locale)}
                  </span>
                  <span className="text-title-md text-foreground truncate flex-1">{ev.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tasks — bottom left */}
        <section className="col-span-7 row-span-3 rounded-3xl bg-surface-container p-6 shadow-elev1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <ListTodo className="w-6 h-6 text-primary" />
            <h2 className="text-title-lg">{t('kioskTasksSection')}</h2>
          </div>
          {todos.length === 0 ? (
            <p className="text-body-lg text-muted-foreground">{t('noTasks')}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 no-scrollbar">
              {todos.slice(0, 8).map(todo => (
                <li key={todo.id} className="flex items-center gap-3 rounded-xl bg-surface-container-high px-4 py-3">
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-hidden />
                  <span className="text-body-lg text-foreground truncate">{todo.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Birthdays — bottom right */}
        <section className="col-span-5 row-span-3 rounded-3xl bg-tertiary-container/70 text-tertiary-container-foreground p-6 shadow-elev1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Cake className="w-6 h-6" />
            <h2 className="text-title-lg">
              {birthdays.length > 0 ? t('birthdaysToday') : t('upcomingBirthdays')}
            </h2>
          </div>
          {birthdays.length === 0 ? (
            <p className="text-body-lg opacity-80">{t('noUpcomingBirthdays')}</p>
          ) : (
            <ul className="space-y-2">
              {birthdays.slice(0, 5).map((b, i) => (
                <li key={`${b.name}-${i}`} className="text-title-md">
                  {b.name}
                  {b.age != null && (
                    <span className="text-body-md opacity-80 ml-2">— {t('turnsAge', { age: b.age })}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
