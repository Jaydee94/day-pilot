import './Weather.css'

const UNIT_SYMBOL = { metric: '°C', imperial: '°F' }
const WIND_UNIT = { metric: 'm/s', imperial: 'mph' }

function toIconUrl(icon) {
  if (!icon) return ''
  return icon.startsWith('//') ? `https:${icon}` : icon
}

function formatHour(value) {
  const date = new Date(value)
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(value) {
  const date = new Date(value)
  return date.toLocaleDateString('de-DE', { weekday: 'short' })
}

export default function Weather({ weather }) {
  if (!weather) {
    return (
      <div className="weather card weather--unavailable">
        <div className="card__header">
          <span className="card__icon">🌤</span>
          <span className="card__title">Weather</span>
        </div>
        <div className="weather__body">
          <div className="weather__main">
            <span className="weather__temp">--</span>
            <span className="weather__desc">Weather data is currently unavailable.</span>
          </div>
        </div>
        <div className="weather__details">
          <span>Feels like --</span>
          <span>💧 --</span>
          <span>💨 --</span>
        </div>
      </div>
    )
  }

  const unitSym = UNIT_SYMBOL[weather.units] || '°C'
  const windUnit = WIND_UNIT[weather.units] || 'm/s'
  const iconUrl = toIconUrl(weather.icon)
  const hourlyForecast = weather.hourly_forecast || []
  const dailyForecast = weather.daily_forecast || []

  return (
    <>
      <div className="weather card">
        <div className="card__header">
          <span className="card__icon">🌤</span>
          <span className="card__title">Weather – {weather.city}</span>
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
          <span>Feels like {Math.round(weather.feels_like)}{unitSym}</span>
          <span>💧 {weather.humidity}%</span>
          <span>💨 {weather.wind_speed} {windUnit}</span>
        </div>

        <div className="weather__section">
          <div className="weather__section-title">Heute stündlich</div>
          {hourlyForecast.length === 0 ? (
            <div className="weather__empty">Keine Stundenprognose verfügbar.</div>
          ) : (
            <div className="weather__hourly-grid">
              {hourlyForecast.map(point => (
                <div className="weather__hourly-item" key={point.time}>
                  <div className="weather__hourly-time">{formatHour(point.time)}</div>
                  <img
                    className="weather__hourly-icon"
                    src={toIconUrl(point.icon)}
                    alt={point.description}
                  />
                  <div className="weather__hourly-temp">{Math.round(point.temperature)}{unitSym}</div>
                  <div className="weather__hourly-rain">💧 {point.chance_of_rain}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="weather card weather__forecast-panel">
        <div className="card__header">
          <span className="card__icon">📅</span>
          <span className="card__title">Nächste 3 Tage</span>
        </div>
        {dailyForecast.length === 0 ? (
          <div className="weather__empty">Keine 3-Tage-Prognose verfügbar.</div>
        ) : (
          <div className="weather__daily-list">
            {dailyForecast.map(day => (
              <div className="weather__daily-item" key={day.date}>
                <div className="weather__daily-day">{formatDay(day.date)}</div>
                <img
                  className="weather__daily-icon"
                  src={toIconUrl(day.icon)}
                  alt={day.description}
                />
                <div className="weather__daily-desc">{day.description}</div>
                <div className="weather__daily-temp">
                  {Math.round(day.min_temperature)}{unitSym} - {Math.round(day.max_temperature)}{unitSym}
                </div>
                <div className="weather__daily-rain">💧 {day.chance_of_rain}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
