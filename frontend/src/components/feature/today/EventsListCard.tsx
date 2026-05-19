import { Calendar, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/feedback/EmptyState'
import type { CalendarEvent } from '@/lib/types'
import { formatTime } from '@/lib/utils'
import { useI18n } from '@/i18n.jsx'

const SOURCE_LABEL: Record<string, { label: string; variant: 'tonal' | 'secondary' | 'tertiary' }> = {
  google: { label: 'Google', variant: 'tonal' },
  ical: { label: 'iCal', variant: 'tonal' },
  apple: { label: 'Apple', variant: 'secondary' },
  local: { label: 'Local', variant: 'tertiary' },
}

interface Props {
  events: CalendarEvent[]
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (eventId: string) => void
}

function formatCountdown(isoStart: string, isoEnd: string, t: (k: string, p?: Record<string, unknown>) => string) {
  const now = Date.now()
  const start = new Date(isoStart).getTime()
  const end = new Date(isoEnd).getTime()
  if (now >= end) return null
  if (now >= start) return { label: t('eventRunning'), running: true }
  const diffMin = Math.ceil((start - now) / 60_000)
  if (diffMin < 1) return { label: t('inXMin', { min: 1 }), running: false }
  if (diffMin < 60) return { label: t('inXMin', { min: diffMin }), running: false }
  const h = Math.floor(diffMin / 60)
  const min = diffMin % 60
  if (min === 0) return { label: t('inXh', { h }), running: false }
  return { label: t('inXhYmin', { h, min }), running: false }
}

export function EventsListCard({ events, onEdit, onDelete }: Props): JSX.Element {
  const { t, locale } = useI18n()

  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-title-lg">{t('eventsCount', { count: events.length })}</h2>
        </div>

        {events.length === 0 ? (
          <EmptyState icon={Calendar} title={t('noEventsToday')} className="py-6" />
        ) : (
          <ul className="space-y-2">
            {events.map(ev => {
              const src = SOURCE_LABEL[ev.source] ?? { label: ev.source, variant: 'tonal' as const }
              const countdown = formatCountdown(ev.start, ev.end, t)
              const canMutate = ev.source === 'local'
              return (
                <li
                  key={ev.id}
                  className="group grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl bg-surface-container px-4 py-3"
                >
                  <div className="flex flex-col items-end leading-tight tabular-nums">
                    <span className="text-label-lg text-foreground">{formatTime(ev.start, locale)}</span>
                    <span className="text-label-sm text-muted-foreground">{formatTime(ev.end, locale)}</span>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-body-lg text-foreground truncate">{ev.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {ev.location && (
                        <span className="text-body-sm text-muted-foreground inline-flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5" /> {ev.location}
                        </span>
                      )}
                      {countdown && (
                        <Badge variant={countdown.running ? 'success' : 'secondary'}>{countdown.label}</Badge>
                      )}
                      <Badge variant={src.variant}>{src.label}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {canMutate && onEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(ev)}
                        aria-label={t('editEvent')}
                        title={t('editEvent')}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canMutate && onDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(ev.id)}
                        aria-label={t('deleteEvent')}
                        title={t('deleteEvent')}
                        className="text-error"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
