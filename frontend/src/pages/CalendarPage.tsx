import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EventsListCard } from '@/components/feature/today/EventsListCard'
import { MemberFilter } from '@/components/feature/calendar/MemberFilter'
import { QuickAddSheet } from '@/components/feature/today/QuickAddSheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import {
  deleteEvent,
  fetchEvents,
  fetchFamilyMembers,
  fetchSyncStatus,
  triggerSchedulerJob,
  updateEvent,
} from '@/lib/api'
import type { CalendarEvent } from '@/lib/types'
import { groupBy } from '@/lib/utils'
import { useI18n } from '@/i18n.jsx'

const SYNC_RELOAD_DELAY_MS = 2000

function formatLastSync(iso: string | null, locale: string, neverLabel: string): string {
  if (!iso) return neverLabel
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
}

export default function CalendarPage(): JSX.Element {
  const { t, locale } = useI18n()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [members, setMembers] = useState<string[]>([])
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  useEffect(() => {
    fetchFamilyMembers().then(setMembers).catch(() => setMembers([]))
  }, [])

  async function loadEvents(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchEvents(selectedMember)
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function loadSyncStatus(): Promise<void> {
    try {
      const status = await fetchSyncStatus()
      setLastSync(status.last_sync ?? null)
    } catch {
      // best-effort
    }
  }

  async function handleSyncNow(): Promise<void> {
    setSyncing(true)
    try {
      await triggerSchedulerJob('calendar_sync')
      toast.success(t('calendarSyncNow'))
      setTimeout(() => {
        loadEvents()
        loadSyncStatus()
      }, SYNC_RELOAD_DELAY_MS)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSyncing(false)
    }
  }

  async function handleDelete(eventId: string): Promise<void> {
    try {
      await deleteEvent(eventId)
      await loadEvents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleEdit(event: CalendarEvent): Promise<void> {
    try {
      await updateEvent(event.id, event)
      await loadEvents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    loadEvents()
    loadSyncStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMember])

  const grouped = useMemo(() => groupBy(events, e => dayKey(e.start)), [events])
  const groupKeys = Object.keys(grouped).sort()

  return (
    <>
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-display-sm text-foreground">{t('calendarTitle')}</h1>
            <p className="text-body-lg text-muted-foreground">{t('calendarSubtitle')}</p>
          </div>
          <Button
            variant="tonal"
            onClick={handleSyncNow}
            disabled={syncing}
            aria-label={t('calendarSyncNow')}
            className="gap-2"
          >
            <RefreshCw className={syncing ? 'animate-spin' : ''} />
            {syncing ? t('calendarSyncing') : t('calendarSyncNow')}
          </Button>
        </header>

        <p className="text-label-md text-muted-foreground">
          {t('calendarLastSync', { time: formatLastSync(lastSync, locale, t('calendarNeverSynced')) })}
        </p>

        <MemberFilter members={members} selected={selectedMember} onChange={setSelectedMember} />

        {loading && events.length === 0 && (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        )}

        {error && <ErrorState message={error} onRetry={loadEvents} retryLabel={t('tryAgain')} />}

        {!loading && !error && groupKeys.length === 0 && (
          <EventsListCard events={[]} />
        )}

        {groupKeys.map(key => (
          <section key={key} className="space-y-2">
            <h2 className="sticky top-16 z-10 -mx-4 px-4 py-2 bg-background/80 backdrop-blur text-label-lg uppercase text-muted-foreground">
              {new Date(key).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <EventsListCard
              events={grouped[key]!}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </section>
        ))}
      </div>
      <QuickAddSheet defaultTab="event" onSuccess={loadEvents} />
    </>
  )
}
