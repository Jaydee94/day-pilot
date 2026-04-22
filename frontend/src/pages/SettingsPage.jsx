import { useState, useEffect } from 'react'
import { fetchSettings, saveSettings } from '../api.js'
import './Page.css'
import './SettingsPage.css'

/**
 * All user-configurable setting groups displayed on the settings page.
 * Each item contains: key (backend field name), label, description, type.
 */
const SETTING_GROUPS = [
  {
    group: 'General',
    icon: '🌍',
    items: [
      { key: 'APP_NAME', label: 'App name', desc: 'Display name shown in the header', type: 'text' },
      { key: 'APP_TIMEZONE', label: 'Timezone', desc: 'e.g. Europe/Berlin, America/New_York', type: 'text' },
      { key: 'DAILY_SUMMARY_TIME', label: 'Daily briefing time', desc: 'HH:MM – when the morning summary is generated', type: 'time' },
    ],
  },
  {
    group: 'Weather',
    icon: '🌤️',
    items: [
      { key: 'OPENWEATHERMAP_API_KEY', label: 'OpenWeatherMap API key', desc: 'Free key from openweathermap.org', type: 'password' },
      { key: 'WEATHER_CITY', label: 'City', desc: 'City name for weather data', type: 'text' },
      {
        key: 'WEATHER_UNITS',
        label: 'Units',
        desc: 'Temperature unit',
        type: 'select',
        options: [
          { value: 'metric', label: 'Metric (°C)' },
          { value: 'imperial', label: 'Imperial (°F)' },
        ],
      },
    ],
  },
  {
    group: 'AI Provider',
    icon: '🤖',
    items: [
      {
        key: 'AI_PROVIDER',
        label: 'Provider',
        desc: 'openai or github',
        type: 'select',
        options: [
          { value: 'openai', label: 'OpenAI (GPT)' },
          { value: 'github', label: 'GitHub Models' },
        ],
      },
      { key: 'OPENAI_API_KEY', label: 'OpenAI API key', desc: 'Key from platform.openai.com', type: 'password' },
      { key: 'OPENAI_MODEL', label: 'OpenAI model', desc: 'e.g. gpt-4o-mini, gpt-4o', type: 'text' },
      { key: 'GITHUB_TOKEN', label: 'GitHub token', desc: 'PAT with models:read permission (for GitHub Models provider)', type: 'password' },
      { key: 'AI_MODEL', label: 'Model override', desc: 'Override the default model for the selected provider', type: 'text' },
    ],
  },
  {
    group: 'Push Notifications (ntfy)',
    icon: '🔔',
    items: [
      { key: 'NTFY_SERVER', label: 'ntfy server', desc: 'e.g. https://ntfy.sh', type: 'text' },
      { key: 'NTFY_TOPIC', label: 'Topic', desc: 'Your ntfy topic name', type: 'text' },
      { key: 'NTFY_TOKEN', label: 'Token (optional)', desc: 'Bearer token for private topics', type: 'password' },
    ],
  },
  {
    group: 'Apple Calendar (iCloud)',
    icon: '📅',
    items: [
      { key: 'CALDAV_URL', label: 'CalDAV URL', desc: 'e.g. https://caldav.icloud.com', type: 'text' },
      { key: 'CALDAV_USERNAME', label: 'Username', desc: 'Your Apple ID email address', type: 'text' },
      { key: 'CALDAV_PASSWORD', label: 'App-Specific Password', desc: 'Generated at appleid.apple.com', type: 'password' },
    ],
  },
  {
    group: 'Voice Control',
    icon: '🎙️',
    items: [
      { key: 'VOICE_WEBHOOK_SECRET', label: 'Webhook secret', desc: 'Strong random secret for the Siri / Google Assistant webhook', type: 'password' },
    ],
  },
]

export default function SettingsPage() {
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null) // 'success' | 'error' | null

  useEffect(() => {
    fetchSettings()
      .then(data => {
        setValues(data)
        setLoading(false)
      })
      .catch(err => {
        setLoadError(err.message)
        setLoading(false)
      })
  }, [])

  function handleChange(key, value) {
    setValues(prev => ({ ...prev, [key]: value }))
    setSaveStatus(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveStatus(null)
    try {
      const updated = await saveSettings(values)
      setValues(updated)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h2 className="page__title">Settings</h2>
        <div className="settings-loading">
          <div className="spinner" />
          <p>Loading settings…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page">
        <h2 className="page__title">Settings</h2>
        <div className="settings-error">
          ⚠️ Could not load settings: {loadError}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="settings-header">
        <div>
          <h2 className="page__title">Settings</h2>
          <p className="page__subtitle">
            Configure DayPilot to match your preferences. Changes take effect immediately.
          </p>
        </div>
      </div>

      {/* Save status toast */}
      {saveStatus === 'success' && (
        <div className="settings-toast settings-toast--success" role="status">
          ✓ Settings saved successfully
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="settings-toast settings-toast--error" role="alert">
          ⚠️ Failed to save settings. Please try again.
        </div>
      )}

      <div className="settings-groups">
        {SETTING_GROUPS.map(({ group, icon, items }) => (
          <div key={group} className="settings-group card">
            <h3 className="settings-group__title">
              <span className="settings-group__icon">{icon}</span>
              {group}
            </h3>
            <div className="settings-group__fields">
              {items.map(({ key, label, desc, type, options }) => (
                <SettingField
                  key={key}
                  fieldKey={key}
                  label={label}
                  desc={desc}
                  type={type}
                  options={options}
                  value={values[key] ?? ''}
                  onChange={v => handleChange(key, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Google Calendar note */}
      <div className="settings-note card">
        <h3 className="settings-group__title">
          <span className="settings-group__icon">📌</span>
          Google Calendar
        </h3>
        <p className="settings-note__text">
          Google Calendar uses OAuth2 file-based authentication. Place your{' '}
          <code>credentials.json</code> in the <code>./data/</code> directory
          on the server and set <code>GOOGLE_CREDENTIALS_JSON</code> in your{' '}
          <code>.env</code> file. The OAuth token is stored automatically
          after the first sign-in flow.
        </p>
      </div>

      {/* Voice webhook info */}
      <div className="settings-note card">
        <h3 className="settings-group__title">
          <span className="settings-group__icon">🎙️</span>
          Voice Control Webhook
        </h3>
        <p className="settings-note__text">
          Use <code>POST /api/voice/command</code> from a Siri Shortcut or
          IFTTT webhook. Include the secret set above in the request payload.
        </p>
      </div>

      {/* Save button */}
      <div className="settings-actions">
        <button
          className="btn settings-actions__save"
          onClick={handleSave}
          disabled={saving}
          aria-label="Save all settings"
        >
          {saving ? 'Saving…' : '💾 Save all settings'}
        </button>
      </div>
    </div>
  )
}

/* ── Field component ─────────────────────────────────────────────────────── */

function SettingField({ fieldKey, label, desc, type, options, value, onChange }) {
  const [visible, setVisible] = useState(false)
  const inputId = `setting-${fieldKey}`
  const isSecret = type === 'password'
  const inputType = isSecret ? (visible ? 'text' : 'password') : type

  return (
    <div className="settings-field">
      <label className="settings-field__label" htmlFor={inputId}>{label}</label>
      {desc && <span className="settings-field__desc">{desc}</span>}
      <div className={`settings-field__input-wrap${isSecret ? ' settings-field__input-wrap--has-toggle' : ''}`}>
        {type === 'select' ? (
          <select
            id={inputId}
            className="settings-field__input settings-field__select"
            value={value}
            onChange={e => onChange(e.target.value)}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            id={inputId}
            className="settings-field__input"
            type={inputType}
            value={value}
            onChange={e => onChange(e.target.value)}
            autoComplete="off"
          />
        )}
        {isSecret && (
          <button
            type="button"
            className="settings-field__toggle"
            onClick={() => setVisible(v => !v)}
            aria-label={visible ? 'Hide value' : 'Show value'}
          >
            {visible ? '🙈' : '👁️'}
          </button>
        )}
      </div>
    </div>
  )
}
