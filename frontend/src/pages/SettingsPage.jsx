import './Page.css'
import './SettingsPage.css'

const SETTINGS = [
  {
    group: 'Google Calendar',
    items: [
      { label: 'Credentials file', env: 'GOOGLE_CREDENTIALS_JSON', desc: 'Path to your OAuth2 credentials.json' },
      { label: 'Token file', env: 'GOOGLE_TOKEN_JSON', desc: 'Path where the access token is stored' },
    ],
  },
  {
    group: 'Apple Calendar (iCloud)',
    items: [
      { label: 'CalDAV URL', env: 'CALDAV_URL', desc: 'e.g. https://caldav.icloud.com' },
      { label: 'Username', env: 'CALDAV_USERNAME', desc: 'Your iCloud email address' },
      { label: 'Password', env: 'CALDAV_PASSWORD', desc: 'App-specific password from appleid.apple.com' },
    ],
  },
  {
    group: 'Weather',
    items: [
      { label: 'API key', env: 'OPENWEATHERMAP_API_KEY', desc: 'Free key from openweathermap.org' },
      { label: 'City', env: 'WEATHER_CITY', desc: 'City name for weather data' },
      { label: 'Units', env: 'WEATHER_UNITS', desc: '"metric" (°C) or "imperial" (°F)' },
    ],
  },
  {
    group: 'AI Summary',
    items: [
      { label: 'OpenAI API key', env: 'OPENAI_API_KEY', desc: 'Key from platform.openai.com' },
      { label: 'Model', env: 'OPENAI_MODEL', desc: 'e.g. gpt-4o-mini' },
    ],
  },
  {
    group: 'Push Notifications (ntfy)',
    items: [
      { label: 'Server', env: 'NTFY_SERVER', desc: 'e.g. https://ntfy.sh' },
      { label: 'Topic', env: 'NTFY_TOPIC', desc: 'Your ntfy topic name' },
      { label: 'Token', env: 'NTFY_TOKEN', desc: 'Optional bearer token for private topics' },
    ],
  },
  {
    group: 'Schedule',
    items: [
      { label: 'Daily time', env: 'DAILY_SUMMARY_TIME', desc: 'HH:MM in your timezone (e.g. 07:00)' },
      { label: 'Timezone', env: 'APP_TIMEZONE', desc: 'e.g. Europe/Berlin, America/New_York' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="page">
      <h2 className="page__title">Settings</h2>
      <p className="page__subtitle">
        All settings are managed via the <code>.env</code> file on your server.
        Copy <code>.env.example</code> to <code>.env</code> and fill in your values,
        then restart the backend container.
      </p>

      <div className="settings-groups">
        {SETTINGS.map(({ group, items }) => (
          <div key={group} className="settings-group card">
            <h3 className="settings-group__title">{group}</h3>
            <ul className="settings-group__list">
              {items.map(({ label, env, desc }) => (
                <li key={env} className="settings-item">
                  <div className="settings-item__left">
                    <span className="settings-item__label">{label}</span>
                    <span className="settings-item__desc">{desc}</span>
                  </div>
                  <code className="settings-item__env">{env}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="settings-voice card">
        <h3 className="settings-group__title">Voice Control (Siri / Google Assistant)</h3>
        <p className="settings-voice__desc">
          DayPilot exposes a webhook at <code>POST /api/voice/command</code>.
          Set a strong <code>VOICE_WEBHOOK_SECRET</code> in your <code>.env</code> and
          use it in your Siri Shortcut or IFTTT webhook payload.
        </p>
      </div>
    </div>
  )
}
