import './Weather.css'
import AppIcon from './AppIcon.jsx'
import { useI18n } from '../i18n.jsx'

const UNIT_SYMBOL = { metric: '°C', imperial: '°F' }
const WIND_UNIT = { metric: 'm/s', imperial: 'mph' }

/** Target hours for the four time-of-day slots. */
const TIME_SLOTS = [
  { key: 'morning',   targetHour: 9  },
  { key: 'noon',      targetHour: 12 },
  { key: 'afternoon', targetHour: 15 },
  { key: 'evening',   targetHour: 18 },
]

function toIconUrl(icon) {
  if (!icon) return ''
  return icon.startsWith('//') ? `https:${icon}` : icon
}

function formatDay(value, locale) {
  const date = new Date(value)
  return date.toLocaleDateString(locale, { weekday: 'short' })
}

/**
 * Pick one forecast point per time-of-day slot.
 * For each target hour, we choose the entry whose hour is closest to the target.
 * If an exact match exists it is preferred; otherwise the nearest available entry is used.
 */
function buildTimeSlots(hourlyForecast) {
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

export default function Weather({ weather }) {
  const { t, locale } = useI18n()

  if (!weather) {
    return (
      <div className="weather card weather--unavailable">
        <div className="card__header">
          <span className="card__icon"><AppIcon name="weather" className="icon" /></span>
          <span className="card__title">{t('weather')}</span>
        </div>
        <div className="weather__body">
          <div className="weather__main">
            <span className="weather__temp">--</span>
            <span className="weather__desc">{t('weatherUnavailable')}</span>
          </div>
        </div>
        <div className="weather__details">
          <span>{t('feelsLike', { value: '--' })}</span>
          <span><AppIcon name="droplet" className="icon" /> --</span>
          <span><AppIcon name="wind" className="icon" /> --</span>
        </div>
      </div>
    )
  }

  const unitSym = UNIT_SYMBOL[weather.units] || '°C'
  const windUnit = WIND_UNIT[weather.units] || 'm/s'
  const iconUrl = toIconUrl(weather.icon)
  const slots = buildTimeSlots(weather.hourly_forecast)
  const dailyForecast = weather.daily_forecast || []

  return (
    <>
      <div className="weather card">
        <div className="card__header">
          <span className="card__icon"><AppIcon name="weather" className="icon" /></span>
          <span className="card__title">{t('weather')} - {weather.city}</span>
        </div>
        <div className="weather__body">
          <img
            className="weather__icon"
            src={iconUrl}
            alt={weather.description}
          />
          <div className="weather__main">
            <span className="weather__temp">
              {Math.round(weather.temperature)}{unitSym}
            </span>
            <span className="weather__desc">{weather.description}</span>
          </div>
        </div>
        <div className="weather__details">
          <span>{t('feelsLike', { value: `${Math.round(weather.feels_like)}${unitSym}` })}</span>
          <span><AppIcon name="droplet" className="icon" /> {weather.humidity}%</span>
          <span><AppIcon name="wind" className="icon" /> {weather.wind_speed} {windUnit}</span>
        </div>

        <div className="weather__section">
          <div className="weather__section-title">{t('todayForecast')}</div>
          {slots.length === 0 ? (
            <div className="weather__empty">{t('noHourlyForecast')}</div>
          ) : (
            <div className="weather__hourly-grid">
              {slots.map(point => (
                <div className="weather__hourly-item" key={point.slotKey}>
                  <div className="weather__hourly-time">{t(point.slotKey)}</div>
                  <img
                    className="weather__hourly-icon"
                    src={toIconUrl(point.icon)}
                    alt={point.description}
                  />
                  <div className="weather__hourly-temp">{Math.round(point.temperature)}{unitSym}</div>
                  <div className="weather__hourly-rain"><AppIcon name="droplet" className="icon" /> {point.chance_of_rain}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="weather card weather__forecast-panel">
        <div className="card__header">
          <span className="card__icon"><AppIcon name="calendar" className="icon" /></span>
          <span className="card__title">{t('next3Days')}</span>
        </div>
        {dailyForecast.length === 0 ? (
          <div className="weather__empty">{t('noDailyForecast')}</div>
        ) : (
          <div className="weather__daily-list">
            {dailyForecast.map(day => (
              <div className="weather__daily-item" key={day.date}>
                <div className="weather__daily-day">{formatDay(day.date, locale)}</div>
                <img
                  className="weather__daily-icon"
                  src={toIconUrl(day.icon)}
                  alt={day.description}
                />
                <div className="weather__daily-desc">{day.description}</div>
                <div className="weather__daily-temp">
                  {Math.round(day.min_temperature)}{unitSym} - {Math.round(day.max_temperature)}{unitSym}
                </div>
                <div className="weather__daily-rain"><AppIcon name="droplet" className="icon" /> {day.chance_of_rain}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
