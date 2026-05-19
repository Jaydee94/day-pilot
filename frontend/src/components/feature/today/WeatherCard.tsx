import { Cloud, CloudRain, Droplets, Wind } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/feedback/EmptyState'
import type { WeatherInfo, HourlyForecastPoint, DailyForecastPoint } from '@/lib/types'
import { useI18n } from '@/i18n.jsx'

const UNIT_SYMBOL: Record<string, string> = { metric: '°C', imperial: '°F' }
const WIND_UNIT: Record<string, string> = { metric: 'm/s', imperial: 'mph' }

const TIME_SLOTS: Array<{ key: 'morning' | 'noon' | 'afternoon' | 'evening'; targetHour: number }> = [
  { key: 'morning', targetHour: 9 },
  { key: 'noon', targetHour: 12 },
  { key: 'afternoon', targetHour: 15 },
  { key: 'evening', targetHour: 18 },
]

function toIconUrl(icon: string): string {
  if (!icon) return ''
  return icon.startsWith('//') ? `https:${icon}` : icon
}

function buildTimeSlots(hourlyForecast: HourlyForecastPoint[]) {
  if (!hourlyForecast || hourlyForecast.length === 0) return []
  return TIME_SLOTS.map(slot => {
    const best = hourlyForecast.reduce((prev, curr) => {
      const prevH = new Date(prev.time).getHours()
      const currH = new Date(curr.time).getHours()
      return Math.abs(currH - slot.targetHour) < Math.abs(prevH - slot.targetHour) ? curr : prev
    })
    return { slotKey: slot.key, ...best }
  })
}

interface Props {
  weather?: WeatherInfo | null
}

export function WeatherCard({ weather }: Props): JSX.Element {
  const { t, locale } = useI18n()

  if (!weather) {
    return (
      <Card variant="elevated">
        <CardContent className="p-0">
          <EmptyState icon={Cloud} title={t('weather')} description={t('weatherUnavailable')} />
        </CardContent>
      </Card>
    )
  }

  const unit = UNIT_SYMBOL[weather.units] ?? '°C'
  const windUnit = WIND_UNIT[weather.units] ?? 'm/s'
  const iconUrl = toIconUrl(weather.icon)
  const slots = buildTimeSlots(weather.hourly_forecast || [])
  const daily: DailyForecastPoint[] = weather.daily_forecast || []

  return (
    <Card variant="elevated" className="bg-tertiary-container/40">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-label-md text-muted-foreground uppercase">{t('weather')}</p>
            <p className="text-title-lg text-foreground">{weather.city}</p>
          </div>
          {iconUrl && (
            <img src={iconUrl} alt={weather.description} className="w-16 h-16 -my-2" loading="lazy" />
          )}
        </div>

        <div className="flex items-end gap-3">
          <span className="text-display-sm text-foreground leading-none">
            {Math.round(weather.temperature)}
            <span className="text-headline-sm align-top opacity-70">{unit}</span>
          </span>
          <span className="text-body-md text-muted-foreground pb-2 capitalize">{weather.description}</span>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-muted-foreground">
          <span>{t('feelsLike', { value: `${Math.round(weather.feels_like)}${unit}` })}</span>
          <span className="inline-flex items-center gap-1">
            <Droplets className="w-4 h-4" /> {weather.humidity}%
          </span>
          <span className="inline-flex items-center gap-1">
            <Wind className="w-4 h-4" /> {weather.wind_speed} {windUnit}
          </span>
        </div>

        {slots.length > 0 && (
          <div className="space-y-2">
            <p className="text-label-md uppercase text-muted-foreground">{t('todayForecast')}</p>
            <div className="grid grid-cols-4 gap-2">
              {slots.map(p => (
                <div
                  key={p.slotKey}
                  className="flex flex-col items-center gap-1 rounded-xl bg-surface-container px-2 py-3"
                >
                  <span className="text-label-sm text-muted-foreground">{t(p.slotKey)}</span>
                  <img src={toIconUrl(p.icon)} alt={p.description} className="w-8 h-8" loading="lazy" />
                  <span className="text-title-sm text-foreground">
                    {Math.round(p.temperature)}
                    {unit}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-label-sm text-muted-foreground">
                    <CloudRain className="w-3 h-3" />
                    {p.chance_of_rain}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {daily.length > 0 && (
          <div className="space-y-2">
            <p className="text-label-md uppercase text-muted-foreground">{t('next3Days')}</p>
            <ul className="divide-y divide-outline-variant">
              {daily.map(day => (
                <li key={day.date} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 py-2">
                  <span className="text-label-lg text-foreground w-12">
                    {new Date(day.date).toLocaleDateString(locale, { weekday: 'short' })}
                  </span>
                  <img src={toIconUrl(day.icon)} alt={day.description} className="w-8 h-8" loading="lazy" />
                  <span className="text-body-sm text-muted-foreground capitalize truncate">{day.description}</span>
                  <span className="text-body-md text-foreground tabular-nums">
                    {Math.round(day.min_temperature)}–{Math.round(day.max_temperature)}
                    {unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
