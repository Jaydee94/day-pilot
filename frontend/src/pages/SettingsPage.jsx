import { useState, useEffect } from 'react'
import { fetchSettings, saveSettings, testIntegrationConnection } from '../api.js'
import AppIcon from '../components/AppIcon.jsx'
import { useI18n } from '../i18n.jsx'
import './Page.css'
import './SettingsPage.css'

const TESTABLE_INTEGRATIONS = [
  'ai',
  'google_calendar',
  'apple_calendar',
  'weather',
  'notifications',
  'voice_webhook',
]

const GROUP_TITLE_KEYS = {
  General: 'settingsGroupGeneral',
  Weather: 'settingsGroupWeather',
  'Push Notifications (ntfy)': 'settingsGroupNotifications',
  'Apple Calendar (iCloud)': 'settingsGroupAppleCalendar',
  'Voice Control': 'settingsGroupVoiceControl',
}

const FIELD_LABEL_KEYS = {
  APP_NAME: 'settingsFieldAppName',
  APP_TIMEZONE: 'settingsFieldAppTimezone',
  APP_LANGUAGE: 'settingsFieldAppLanguage',
  DAILY_SUMMARY_TIME: 'settingsFieldDailyBriefingTime',
  WEATHERAPI_API_KEY: 'settingsFieldWeatherApiKey',
  WEATHER_CITY: 'settingsFieldCity',
  WEATHER_UNITS: 'settingsFieldUnits',
  NTFY_SERVER: 'settingsFieldNtfyServer',
  NTFY_TOPIC: 'settingsFieldTopic',
  NTFY_TOKEN: 'settingsFieldTokenOptional',
  CALDAV_URL: 'settingsFieldCaldavUrl',
  CALDAV_USERNAME: 'settingsFieldUsername',
  CALDAV_PASSWORD: 'settingsFieldAppSpecificPassword',
  CALDAV_CONFIGS: 'settingsCaldavConfigsLabel',
  VOICE_WEBHOOK_SECRET: 'settingsFieldWebhookSecret',
}

const FIELD_DESC_KEYS = {
  APP_NAME: 'settingsFieldAppNameDesc',
  APP_TIMEZONE: 'settingsFieldAppTimezoneDesc',
  APP_LANGUAGE: 'settingsFieldAppLanguageDesc',
  DAILY_SUMMARY_TIME: 'settingsFieldDailyBriefingTimeDesc',
  WEATHERAPI_API_KEY: 'settingsFieldWeatherApiKeyDesc',
  WEATHER_CITY: 'settingsFieldCityDesc',
  WEATHER_UNITS: 'settingsFieldUnitsDesc',
  NTFY_SERVER: 'settingsFieldNtfyServerDesc',
  NTFY_TOPIC: 'settingsFieldTopicDesc',
  NTFY_TOKEN: 'settingsFieldTokenOptionalDesc',
  CALDAV_URL: 'settingsFieldCaldavUrlDesc',
  CALDAV_USERNAME: 'settingsFieldUsernameDesc',
  CALDAV_PASSWORD: 'settingsFieldAppSpecificPasswordDesc',
  CALDAV_CONFIGS: 'settingsCaldavConfigsDesc',
  VOICE_WEBHOOK_SECRET: 'settingsFieldWebhookSecretDesc',
}

function localizeField(t, field) {
  const localized = {
    ...field,
    label: t(FIELD_LABEL_KEYS[field.key] || field.label),
    desc: t(FIELD_DESC_KEYS[field.key] || field.desc),
  }

  if (field.key === 'APP_LANGUAGE') {
    localized.options = [
      { value: 'en', label: t('languageEnglish') },
      { value: 'de', label: t('languageGerman') },
    ]
  }

  if (field.key === 'WEATHER_UNITS') {
    localized.options = [
      { value: 'metric', label: t('metricUnits') },
      { value: 'imperial', label: t('imperialUnits') },
    ]
  }

  return localized
}

/**
 * All user-configurable setting groups displayed on the settings page.
 * The AI Provider section is rendered separately as AIProviderSection.
 */
const SETTING_GROUPS = [
  {
    group: 'General',
    icon: 'globe',
    integration: null,
    items: [
      { key: 'APP_NAME', label: 'App name', desc: 'Display name shown in the header', type: 'text' },
      { key: 'APP_TIMEZONE', label: 'Timezone', desc: 'e.g. Europe/Berlin, America/New_York', type: 'text' },
      {
        key: 'APP_LANGUAGE',
        label: 'App language',
        desc: 'Language for frontend and daily AI briefing',
        type: 'select',
        options: [
          { value: 'en', label: 'English' },
          { value: 'de', label: 'Deutsch' },
        ],
      },
      { key: 'DAILY_SUMMARY_TIME', label: 'Daily briefing time', desc: 'HH:MM – when the morning summary is generated', type: 'time' },
    ],
  },
  {
    group: 'Weather',
    icon: 'weather',
    integration: 'weather',
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
    icon: 'bell',
    integration: 'notifications',
    items: [
      { key: 'NTFY_SERVER', label: 'ntfy server', desc: 'e.g. https://ntfy.sh', type: 'text' },
      { key: 'NTFY_TOPIC', label: 'Topic', desc: 'Your ntfy topic name', type: 'text' },
      { key: 'NTFY_TOKEN', label: 'Token (optional)', desc: 'Bearer token for private topics', type: 'password' },
    ],
  },
  {
    group: 'Apple Calendar (iCloud)',
    icon: 'calendar',
    integration: 'apple_calendar',
    items: [
      { key: 'CALDAV_URL', label: 'CalDAV URL', desc: 'e.g. https://caldav.icloud.com', type: 'text' },
      { key: 'CALDAV_USERNAME', label: 'Username', desc: 'Your Apple ID email address', type: 'text' },
      { key: 'CALDAV_PASSWORD', label: 'App-Specific Password', desc: 'Generated at appleid.apple.com', type: 'password' },
      { key: 'CALDAV_CONFIGS', label: 'Multiple CalDAV accounts (JSON)', desc: 'Optional: connect more than one iCloud / CalDAV account. Enter a JSON array, e.g. [{"url":"https://caldav.icloud.com","username":"you@icloud.com","password":"xxxx-xxxx-xxxx-xxxx"}]', type: 'text' },
    ],
  },
  {
    group: 'Voice Control',
    icon: 'mic',
    integration: 'voice_webhook',
    items: [
      { key: 'VOICE_WEBHOOK_SECRET', label: 'Webhook secret', desc: 'Strong random secret for the Siri / Google Assistant webhook', type: 'password' },
    ],
  },
]

export default function SettingsPage({ onLanguageChange }) {
  const { t } = useI18n()
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null) // 'success' | 'error' | null
  const [connectionStates, setConnectionStates] = useState({})

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
      if (onLanguageChange) {
        onLanguageChange((updated.APP_LANGUAGE || values.APP_LANGUAGE) === 'de' ? 'de' : 'en')
      }
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 6000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection(integration) {
    if (!integration) return

    setConnectionStates(prev => ({
      ...prev,
      [integration]: { loading: true, ok: null, message: t('connectionTesting') },
    }))

    try {
      const result = await testIntegrationConnection(integration, values)
      setConnectionStates(prev => ({
        ...prev,
        [integration]: { loading: false, ok: result.ok, message: result.message },
      }))
      if (result.ok) {
        setTimeout(() => {
          setConnectionStates(prev => {
            if (!prev[integration]?.ok) return prev
            return { ...prev, [integration]: null }
          })
        }, 6000)
      }
    } catch (err) {
      setConnectionStates(prev => ({
        ...prev,
        [integration]: { loading: false, ok: false, message: err.message },
      }))
    }
  }

  async function handleTestAllConnections() {
    for (const integration of TESTABLE_INTEGRATIONS) {
      // Run one-by-one to keep feedback readable in the UI.
      // eslint-disable-next-line no-await-in-loop
      await handleTestConnection(integration)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h2 className="page__title">{t('settingsTitle')}</h2>
        <div className="settings-loading">
          <div className="spinner" />
          <p>{t('settingsLoading')}</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page">
        <h2 className="page__title">{t('settingsTitle')}</h2>
        <div className="settings-error">
          {t('settingsLoadError', { error: loadError })}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="settings-header">
        <div>
          <h2 className="page__title">{t('settingsTitle')}</h2>
          <p className="page__subtitle">
            {t('settingsSubtitle')}
          </p>
        </div>
        <button
          type="button"
          className="settings-test-all-btn"
          onClick={handleTestAllConnections}
          aria-label={t('testAllIntegrations')}
        >
          {t('testAllIntegrations')}
        </button>
      </div>

      {/* Save status toast */}
      {saveStatus === 'success' && (
        <div className="settings-toast settings-toast--success" role="status">
          {t('settingsSaved')}
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="settings-toast settings-toast--error" role="alert">
          {t('settingsSaveFailed')}
        </div>
      )}

      <div className="settings-groups">
        {/* General + Weather groups */}
        {SETTING_GROUPS.slice(0, 2).map(({ group, icon, items, integration }) => (
          <div key={group} className="settings-group card">
            <div className="settings-group__head">
              <h3 className="settings-group__title">
                <span className="settings-group__icon"><AppIcon name={icon} className="icon" /></span>
                {t(GROUP_TITLE_KEYS[group] || group)}
              </h3>
              {integration && (
                <button
                  type="button"
                  className="settings-test-btn"
                  onClick={() => handleTestConnection(integration)}
                  disabled={connectionStates[integration]?.loading}
                  aria-label={t('testConnection')}
                >
                  {connectionStates[integration]?.loading ? t('testingConnection') : t('testConnection')}
                </button>
              )}
            </div>
            {integration && connectionStates[integration]?.message && (
              <p
                className={`settings-test-result ${connectionStates[integration]?.ok ? 'settings-test-result--success' : 'settings-test-result--error'}`}
                role="status"
              >
                {connectionStates[integration]?.ok ? t('connected') : t('notConnected')}: {connectionStates[integration]?.message}
              </p>
            )}
            <div className="settings-group__fields">
              {items.map((item) => {
                const localized = localizeField(t, item)
                return (
                <SettingField
                  key={localized.key}
                  fieldKey={localized.key}
                  label={localized.label}
                  desc={localized.desc}
                  type={localized.type}
                  options={localized.options}
                  value={values[localized.key] ?? ''}
                  onChange={v => handleChange(localized.key, v)}
                />
              )})}
            </div>
          </div>
        ))}

        {/* AI Provider section — dynamic credential + model fields */}
        <AIProviderSection
          values={values}
          onChange={handleChange}
          onTest={handleTestConnection}
          connectionState={connectionStates.ai}
          t={t}
        />

        {/* Remaining groups (Notifications, CalDAV, Voice) */}
        {SETTING_GROUPS.slice(2).map(({ group, icon, items, integration }) => (
          <div key={group} className="settings-group card">
            <div className="settings-group__head">
              <h3 className="settings-group__title">
                <span className="settings-group__icon"><AppIcon name={icon} className="icon" /></span>
                {t(GROUP_TITLE_KEYS[group] || group)}
              </h3>
              {integration && (
                <button
                  type="button"
                  className="settings-test-btn"
                  onClick={() => handleTestConnection(integration)}
                  disabled={connectionStates[integration]?.loading}
                  aria-label={t('testConnection')}
                >
                  {connectionStates[integration]?.loading ? t('testingConnection') : t('testConnection')}
                </button>
              )}
            </div>
            {integration && connectionStates[integration]?.message && (
              <p
                className={`settings-test-result ${connectionStates[integration]?.ok ? 'settings-test-result--success' : 'settings-test-result--error'}`}
                role="status"
              >
                {connectionStates[integration]?.ok ? t('connected') : t('notConnected')}: {connectionStates[integration]?.message}
              </p>
            )}
            <div className="settings-group__fields">
              {items.map((item) => {
                const localized = localizeField(t, item)
                return (
                <SettingField
                  key={localized.key}
                  fieldKey={localized.key}
                  label={localized.label}
                  desc={localized.desc}
                  type={localized.type}
                  options={localized.options}
                  value={values[localized.key] ?? ''}
                  onChange={v => handleChange(localized.key, v)}
                />
              )})}
            </div>
          </div>
        ))}
      </div>

      {/* Google Calendar note */}
      <div className="settings-note card">
        <div className="settings-group__head">
          <h3 className="settings-group__title">
            <span className="settings-group__icon"><AppIcon name="pin" className="icon" /></span>
            {t('settingsGoogleCalendarTitle')}
          </h3>
          <button
            type="button"
            className="settings-test-btn"
            onClick={() => handleTestConnection('google_calendar')}
            disabled={connectionStates.google_calendar?.loading}
            aria-label={t('testConnection')}
          >
            {connectionStates.google_calendar?.loading ? t('testingConnection') : t('testConnection')}
          </button>
        </div>
        {connectionStates.google_calendar?.message && (
          <p
            className={`settings-test-result ${connectionStates.google_calendar?.ok ? 'settings-test-result--success' : 'settings-test-result--error'}`}
            role="status"
          >
            {connectionStates.google_calendar?.ok ? t('connected') : t('notConnected')}: {connectionStates.google_calendar?.message}
          </p>
        )}
        <p className="settings-note__text">
          {t('settingsGoogleCalendarNote1')} <code>credentials.json</code> {t('settingsGoogleCalendarNote2')} <code>./data/</code> {t('settingsGoogleCalendarNote3')} <code>GOOGLE_CREDENTIALS_JSON</code> {t('settingsGoogleCalendarNote4')} <code>.env</code> {t('settingsGoogleCalendarNote5')}
        </p>
        <p className="settings-note__text">
          {t('settingsGoogleCalendarMultiNote')}
        </p>
        <p className="settings-note__text">
          <a
            href="https://github.com/Jaydee94/day-pilot/blob/main/docs/getting-started.md#step-3--connect-google-calendar"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('settingsGoogleCalendarSetupLink')}
          </a>
        </p>
      </div>

      {/* Internal calendar info */}
      <div className="settings-note card">
        <h3 className="settings-group__title">
          <span className="settings-group__icon"><AppIcon name="calendar" className="icon" /></span>
          {t('settingsLocalCalendarTitle')}
        </h3>
        <p className="settings-note__text">
          {t('settingsLocalCalendarNote')}
        </p>
      </div>

      {/* Voice webhook info */}
      <div className="settings-note card">
        <h3 className="settings-group__title">
          <span className="settings-group__icon"><AppIcon name="mic" className="icon" /></span>
          {t('settingsVoiceWebhookTitle')}
        </h3>
        <p className="settings-note__text">
          {t('settingsVoiceWebhookNote1')} <code>POST /api/voice/command</code> {t('settingsVoiceWebhookNote2')}
        </p>
      </div>

      {/* Save button */}
      <div className="settings-actions">
        <button
          className="btn settings-actions__save"
          onClick={handleSave}
          disabled={saving}
          aria-label={t('saveAllSettingsLabel')}
        >
          {saving ? t('save') : (
            <>
              <AppIcon name="save" className="settings-save__icon" /> {t('saveAllSettings')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ── AI Provider section ─────────────────────────────────────────────────── */

function AIProviderSection({ values, onChange, onTest, connectionState, t }) {
  const provider = values.AI_PROVIDER || 'openai'
  const cred = {
    openai: { key: 'OPENAI_API_KEY', label: t('settingsAiOpenAiKeyLabel'), desc: t('settingsAiOpenAiKeyDesc'), link: 'https://platform.openai.com/api-keys' },
    github: { key: 'GITHUB_TOKEN', label: t('settingsAiGithubTokenLabel'), desc: t('settingsAiGithubTokenDesc'), link: 'https://github.com/settings/tokens' },
    groq: { key: 'GROQ_API_KEY', label: t('settingsAiGroqKeyLabel'), desc: t('settingsAiGroqKeyDesc'), link: 'https://console.groq.com' },
    google: { key: 'GOOGLE_AI_API_KEY', label: t('settingsAiGoogleKeyLabel'), desc: t('settingsAiGoogleKeyDesc'), link: 'https://aistudio.google.com/app/apikey' },
  }[provider]

  const modelOptions = {
    openai: [
      { value: 'gpt-4o-mini', label: t('modelOpenAiMiniRecommended') },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'o4-mini', label: 'o4-mini' },
      { value: 'o3-mini', label: 'o3-mini' },
    ],
    github: [
      { value: 'gpt-4o-mini', label: t('modelGithubMiniDefault') },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'o1-mini', label: 'o1-mini' },
      { value: 'o3-mini', label: 'o3-mini' },
      { value: 'Meta-Llama-3.1-70B-Instruct', label: 'Llama 3.1 70B (Meta)' },
      { value: 'Mistral-large-2407', label: 'Mistral Large' },
      { value: 'Phi-3.5-MoE-instruct', label: 'Phi 3.5 MoE' },
    ],
    groq: [
      { value: 'llama-3.3-70b-versatile', label: t('modelGroqDefaultFree') },
      { value: 'llama-3.1-8b-instant', label: t('modelGroqInstantFree') },
      { value: 'llama-3.2-11b-vision-preview', label: t('modelGroqVisionFree') },
      { value: 'gemma2-9b-it', label: t('modelGroqGemmaFree') },
      { value: 'mixtral-8x7b-32768', label: t('modelGroqMixtralFree') },
    ],
    google: [
      { value: 'gemini-2.0-flash', label: t('modelGoogleFlashDefaultFree') },
      { value: 'gemini-2.0-flash-lite', label: t('modelGoogleFlashLiteFree') },
      { value: 'gemini-1.5-flash', label: t('modelGoogleFlashFree') },
      { value: 'gemini-1.5-flash-8b', label: t('modelGoogleFlash8bFree') },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
  }[provider] || []

  const providerOptions = [
    { value: 'openai', label: t('settingsAiProviderOpenAi') },
    { value: 'github', label: t('settingsAiProviderGithub') },
    { value: 'groq', label: t('settingsAiProviderGroq') },
    { value: 'google', label: t('settingsAiProviderGoogle') },
  ]

  const freeBadge = (provider === 'groq' || provider === 'google')
    ? <span className="settings-badge settings-badge--free">{t('freeTier')}</span>
    : null

  return (
    <div className="settings-group card">
      <div className="settings-group__head">
        <h3 className="settings-group__title">
          <span className="settings-group__icon"><AppIcon name="robot" className="icon" /></span>
          {t('settingsAiProviderTitle')}
          {freeBadge}
        </h3>
        <button
          type="button"
          className="settings-test-btn"
          onClick={() => onTest('ai')}
          disabled={connectionState?.loading}
          aria-label={t('testConnection')}
        >
          {connectionState?.loading ? t('testingConnection') : t('testConnection')}
        </button>
      </div>
      {connectionState?.message && (
        <p className={`settings-test-result ${connectionState?.ok ? 'settings-test-result--success' : 'settings-test-result--error'}`} role="status">
          {connectionState?.ok ? t('connected') : t('notConnected')}: {connectionState?.message}
        </p>
      )}
      <div className="settings-group__fields">
        {/* Provider selector */}
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="setting-AI_PROVIDER">{t('settingsAiProviderLabel')}</label>
          <span className="settings-field__desc">{t('settingsAiProviderDesc')}</span>
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
            desc={<>{cred.desc} — <a href={cred.link} target="_blank" rel="noreferrer">{t('getFreeKey')} ↗</a></>}
            type="password"
            value={values[cred.key] ?? ''}
            onChange={v => onChange(cred.key, v)}
          />
        )}

        {/* Model selector */}
        <div className="settings-field">
          <label className="settings-field__label" htmlFor="setting-AI_MODEL">{t('settingsAiModelLabel')}</label>
          <span className="settings-field__desc">{t('settingsAiModelDesc')}</span>
          <div className="settings-field__input-wrap">
            <select
              id="setting-AI_MODEL"
              className="settings-field__input settings-field__select"
              value={values.AI_MODEL || ''}
              onChange={e => onChange('AI_MODEL', e.target.value)}
            >
              <option value="">{t('providerDefaultModel')}</option>
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
  const { t } = useI18n()
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
            aria-label={visible ? t('hideValue') : t('showValue')}
          >
            <AppIcon name={visible ? 'eyeOff' : 'eye'} className="settings-toggle__icon" />
          </button>
        )}
      </div>
    </div>
  )
}
