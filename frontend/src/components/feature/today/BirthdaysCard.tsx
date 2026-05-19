import { useEffect, useState } from 'react'
import { Cake } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchBirthdays } from '@/lib/api'
import type { Birthday } from '@/lib/types'
import { useI18n } from '@/i18n.jsx'

const MAX_UPCOMING = 5

function formatRelativeDate(iso: string, t: (k: string, p?: Record<string, unknown>) => string, locale: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(iso)
  date.setHours(0, 0, 0, 0)
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000)
  if (diffDays === 0) return t('birthdayToday')
  if (diffDays === 1) return t('birthdayTomorrow')
  if (diffDays <= 7) return t('birthdayInXDays', { days: diffDays })
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

interface Props {
  todayBirthdays?: Birthday[]
}

export function BirthdaysCard({ todayBirthdays = [] }: Props): JSX.Element {
  const { t, locale } = useI18n()
  const [upcoming, setUpcoming] = useState<Birthday[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBirthdays(366, MAX_UPCOMING)
      .then(setUpcoming)
      .catch(() => setUpcoming([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cake className="w-5 h-5 text-tertiary" />
          <h2 className="text-title-lg">
            {todayBirthdays.length > 0 ? t('birthdaysToday') : t('upcomingBirthdays')}
          </h2>
        </div>

        {todayBirthdays.length > 0 && (
          <ul aria-label={t('birthdaysToday')} className="space-y-2">
            {todayBirthdays.map((b, i) => (
              <li
                key={`${b.name}-${i}`}
                className="flex items-center gap-3 rounded-xl bg-tertiary-container/60 text-tertiary-container-foreground px-3 py-2.5"
              >
                <Avatar name={b.name} size="sm" color="hsl(var(--tertiary) / 0.25)" />
                <span className="text-body-lg flex-1 font-medium">{b.name}</span>
                {b.age != null && <Badge variant="tertiary">{t('turnsAge', { age: b.age })}</Badge>}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          {todayBirthdays.length > 0 && upcoming.length > 0 && (
            <p className="text-label-md uppercase text-muted-foreground pt-2">{t('upcomingBirthdays')}</p>
          )}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : upcoming.length === 0 && todayBirthdays.length === 0 ? (
            <p className="text-body-md text-muted-foreground">{t('noUpcomingBirthdays')}</p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {upcoming.map(b => (
                <li key={`${b.name}-${b.date}`} className="flex items-center gap-3 py-2.5">
                  <Avatar name={b.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md text-foreground truncate">{b.name}</p>
                    {b.age != null && (
                      <p className="text-body-sm text-muted-foreground">{t('turnsAge', { age: b.age })}</p>
                    )}
                  </div>
                  <span className="text-label-md text-muted-foreground">
                    {formatRelativeDate(b.date, t, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
