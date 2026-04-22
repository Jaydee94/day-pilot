import './Weather.css'

const UNIT_SYMBOL = { metric: '°C', imperial: '°F' }
const WIND_UNIT = { metric: 'm/s', imperial: 'mph' }

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
  const iconUrl = weather.icon?.startsWith('//')
    ? `https:${weather.icon}`
    : weather.icon

  return (
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
    </div>
  )
}
