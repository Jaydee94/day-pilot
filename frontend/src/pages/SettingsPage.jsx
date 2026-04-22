import { useState, useEffect } from 'react'
import { fetchSettings, saveSettings } from '../api.js'
import './Page.css'
import './SettingsPage.css'

// Known models per provider for the model dropdown
const PROVIDER_MODELS = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini (recommended)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'o4-mini', label: 'o4-mini' },
    { value: 'o3-mini', label: 'o3-mini' },
  ],
  github: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini (default)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'o1-mini', label: 'o1-mini' },
    { value: 'o3-mini', label: 'o3-mini' },
    { value: 'Meta-Llama-3.1-70B-Instruct', label: 'Llama 3.1 70B (Meta)' },
    { value: 'Mistral-large-2407', label: 'Mistral Large' },
    { value: 'Phi-3.5-MoE-instruct', label: 'Phi 3.5 MoE' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (default, free)' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (free)' },
    { value: 'llama-3.2-11b-vision-preview', label: 'Llama 3.2 11B Vision (free)' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B (free)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (free)' },
  ],
  google: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (default, free)' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (free)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (free)' },
    { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8B (free)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
}

// Provider-specific credential fields
const PROVIDER_CREDENTIAL = {
  openai: { key: 'OPENAI_API_KEY', label: 'OpenAI API key', desc: 'Key from platform.openai.com', link: 'https://platform.openai.com/api-keys' },
  github: { key: 'GITHUB_TOKEN', label: 'GitHub token', desc: 'Fine-grained PAT with "Models: read" permission', link: 'https://github.com/settings/tokens' },
  groq: { key: 'GROQ_API_KEY', label: 'Groq API key', desc: 'Free key from console.groq.com', link: 'https://console.groq.com' },
  google: { key: 'GOOGLE_AI_API_KEY', label: 'Google AI API key', desc: 'Free key from aistudio.google.com', link: 'https://aistudio.google.com/app/apikey' },
}

/**
 * All user-configurable setting groups displayed on the settings page.
 * The AI Provider section is rendered separately as AIProviderSection.
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
      { key: 'WEATHERAPI_API_KEY', label: 'WeatherAPI key', desc: 'Free key from weatherapi.com', type: 'password' },
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
        {/* General + Weather groups */}
        {SETTING_GROUPS.slice(0, 2).map(({ group, icon, items }) => (
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

        {/* AI Provider section — dynamic credential + model fields */}
        <AIProviderSection values={values} onChange={handleChange} />

        {/* Remaining groups (Notifications, CalDAV, Voice) */}
        {SETTING_GROUPS.slice(2).map(({ group, icon, items }) => (
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

/* ── AI Provider section ─────────────────────────────────────────────────── */

function AIProviderSection({ values, onChange }) {
  const provider = values.AI_PROVIDER || 'openai'
  const cred = PROVIDER_CREDENTIAL[provider]
  const modelOptions = PROVIDER_MODELS[provider] || []

  const providerOptions = [
    { value: 'openai', label: 'OpenAI (GPT)' },
    { value: 'github', label: 'GitHub Models' },
    { value: 'groq', label: 'Groq — free tier' },
    { value: 'google', label: 'Google Gemini — free tier' },
  ]

  const freeBadge = (provider === 'groq' || provider === 'google')
    ? <span className="settings-badge settings-badge--free">Free tier</span>
    : null

  return (
    <div className="settings-group card">
      <h3 className="settings-group__title">
        <span className="settings-group__icon">🤖</span>
        AI Provider
        {freeBadge}
      </h3>
      <div className="settings-group__fields">
        {/* Provider selector */}
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="setting-AI_PROVIDER">Provider</label>
          <span className="settings-field__desc">Which AI service generates the daily briefing</span>
          <div className="settings-field__input-wrap">
            <select
              id="setting-AI_PROVIDER"
              className="settings-field__input settings-field__select"
              value={provider}
              onChange={e => onChange('AI_PROVIDER', e.target.value)}
            >
              {providerOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Credential field — changes with provider */}
        {cred && (
          <SettingField
            key={cred.key}
            fieldKey={cred.key}
            label={cred.label}
            desc={<>{cred.desc} — <a href={cred.link} target="_blank" rel="noreferrer">Get free key ↗</a></>}
            type="password"
            value={values[cred.key] ?? ''}
            onChange={v => onChange(cred.key, v)}
          />
        )}

        {/* Model selector */}
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="setting-AI_MODEL">Model</label>
          <span className="settings-field__desc">Leave on default or choose a specific model</span>
          <div className="settings-field__input-wrap">
            <select
              id="setting-AI_MODEL"
              className="settings-field__input settings-field__select"
              value={values.AI_MODEL || ''}
              onChange={e => onChange('AI_MODEL', e.target.value)}
            >
              <option value="">— Provider default —</option>
              {modelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
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
