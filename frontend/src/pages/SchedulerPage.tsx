import { useCallback, useEffect, useState } from 'react'
import { Calendar, Cloud, Play, RefreshCw, Sparkles, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { EmptyState } from '@/components/feedback/EmptyState'
import { fetchSchedulerJobs, triggerSchedulerJob } from '@/lib/api'
import type { ScheduledJob } from '@/lib/types'
import { useI18n } from '@/i18n.jsx'

const JOB_ICON: Record<string, LucideIcon> = {
  daily_summary: Sparkles,
  calendar_sync: Calendar,
  weather_cache_refresh: Cloud,
}

const JOB_DISPLAY: Record<string, string> = {
  daily_summary: 'Daily Briefing',
  calendar_sync: 'Calendar Sync',
  weather_cache_refresh: 'Weather Refresh',
}

function formatCountdown(seconds: number | null): string {
  if (seconds == null || seconds < 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function formatNextRun(iso: string | null | undefined, locale: string, unknownLabel: string): string {
  if (!iso) return unknownLabel
  return new Date(iso).toLocaleString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function JobCard({ job, onTrigger }: { job: ScheduledJob; onTrigger: (id: string) => Promise<void> }): JSX.Element {
  const { t, locale } = useI18n()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [triggering, setTriggering] = useState(false)
  const Icon = JOB_ICON[job.id] ?? Timer

  useEffect(() => {
    if (!job.next_run) return
    const tick = (): void => {
      const diff = Math.round((new Date(job.next_run!).getTime() - Date.now()) / 1000)
      setSecondsLeft(diff > 0 ? diff : 0)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [job.next_run])

  const urgent = secondsLeft != null && secondsLeft < 120

  return (
    <Card variant="elevated">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-primary-container-foreground flex-shrink-0">
            <Icon className="w-5 h-5" />
          </span>
          <div className="space-y-0.5 min-w-0 flex-1">
            <h3 className="text-title-md text-foreground truncate">{JOB_DISPLAY[job.id] ?? job.name}</h3>
            <p className="text-body-sm text-muted-foreground line-clamp-2">{job.description}</p>
          </div>
        </div>

        <div className="space-y-1.5 text-body-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('schedulerTrigger')}</span>
            <code className="text-foreground bg-surface-container-high rounded px-2 py-0.5 text-label-sm">{job.trigger}</code>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t('schedulerNextRun')}</span>
            <span className="text-foreground tabular-nums">
              {formatNextRun(job.next_run, locale, t('unknown'))}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">in</span>
            <Badge variant={urgent ? 'warning' : 'tonal'} className="tabular-nums">
              {formatCountdown(secondsLeft)}
            </Badge>
          </div>
        </div>

        <Button
          variant="tonal"
          size="default"
          onClick={async () => {
            setTriggering(true)
            try {
              await onTrigger(job.id)
            } finally {
              setTriggering(false)
            }
          }}
          disabled={triggering}
          className="w-full gap-2"
          aria-label={`${JOB_DISPLAY[job.id] ?? job.name} ${t('schedulerRunNow')}`}
        >
          <Play className="w-4 h-4" />
          {triggering ? t('schedulerStarting') : t('schedulerRunNow')}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function SchedulerPage(): JSX.Element {
  const { t } = useI18n()
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchSchedulerJobs()
      setJobs(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  async function handleTrigger(jobId: string): Promise<void> {
    try {
      await triggerSchedulerJob(jobId)
      toast.success(t('schedulerStarted'))
      setTimeout(load, 1500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-display-sm text-foreground">{t('schedulerTitle')}</h1>
          <p className="text-body-lg text-muted-foreground">{t('schedulerSubtitle')}</p>
        </div>
        <Button variant="text" onClick={load} disabled={loading} className="gap-2" aria-label={t('schedulerRefresh')}>
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          {t('schedulerRefresh')}
        </Button>
      </header>

      {loading && jobs.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} retryLabel={t('schedulerRetry')} />}

      {!loading && !error && jobs.length === 0 && (
        <EmptyState icon={Timer} title={t('schedulerEmpty')} />
      )}

      {!error && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => <JobCard key={job.id} job={job} onTrigger={handleTrigger} />)}
        </div>
      )}
    </div>
  )
}
