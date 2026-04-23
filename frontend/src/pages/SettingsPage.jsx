import { useState, useEffect } from 'react'
import {
  fetchSettings,
  saveSettings,
  testIntegrationConnection,
  uploadGoogleCredentials,
  fetchGoogleCredentials,
  deleteGoogleCredential,
  fetchCalDAVAccounts,
  addCalDAVAccount,
  deleteCalDAVAccount,
} from '../api.js'
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
  'Google Calendar': 'settingsGroupGoogleCalendar',
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
  GOOGLE_CREDENTIALS_JSON: 'settingsFieldGoogleCredentialsJson',
  GOOGLE_TOKEN_JSON: 'settingsFieldGoogleTokenJson',
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
  GOOGLE_CREDENTIALS_JSON: 'settingsFieldGoogleCredentialsJsonDesc',
  GOOGLE_TOKEN_JSON: 'settingsFieldGoogleTokenJsonDesc',
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
    group: 'Google Calendar',
    icon: 'calendar',
    integration: 'google_calendar',
    items: [
      { key: 'GOOGLE_CREDENTIALS_JSON', label: 'Credentials file path', desc: 'Path to your OAuth2 credentials.json file on the server', type: 'text' },
      { key: 'GOOGLE_TOKEN_JSON', label: 'Token file path', desc: 'Path where the OAuth2 token is stored', type: 'text' },
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

        {/* Remaining groups (Notifications, Google Calendar, Apple Calendar, Voice) */}
        {SETTING_GROUPS.slice(2).map(({ group, icon, items, integration }) => {
          if (group === 'Google Calendar') {
            return (
              <GoogleCalendarSection
                key={group}
                icon={icon}
                items={items}
                values={values}
                onChange={handleChange}
                onTest={handleTestConnection}
                connectionState={connectionStates[integration]}
                t={t}
              />
            )
          }
          if (group === 'Apple Calendar (iCloud)') {
            return (
              <AppleCalendarSection
                key={group}
                icon={icon}
                items={items}
                values={values}
                onChange={handleChange}
                onTest={handleTestConnection}
                connectionState={connectionStates[integration]}
                t={t}
              />
            )
          }
          return (
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
        )})}

      </div>

      {/* Google Calendar setup info */}
      <div className="settings-note card">
        <h3 className="settings-group__title">
          <span className="settings-group__icon"><AppIcon name="pin" className="icon" /></span>
          {t('settingsGoogleCalendarTitle')}
        </h3>
        <p className="settings-note__text">
          {t('settingsGoogleCalendarSetupNote')}
        </p>
        <p className="settings-note__text">
          {t('settingsGoogleCalendarMultiNote')}
        </p>
        <p className="settings-note__text">
          <a
            href="docs/getting-started.md"
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

/* ── Google Calendar section ─────────────────────────────────────────────── */

function GoogleCalendarSection({ icon, values, onChange, onTest, connectionState, t }) {
  const [credentials, setCredentials] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchGoogleCredentials()
      .then(setCredentials)
      .catch(() => setCredentials([]))
  }, [])

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)
    try {
      await uploadGoogleCredentials(file)
      const updated = await fetchGoogleCredentials()
      setCredentials(updated)
      // Sync the path setting value
      const paths = updated.map(c => c.path).join(',')
      onChange('GOOGLE_CREDENTIALS_JSON', paths)
      setUploadSuccess(t('googleCredentialsUploaded') || 'Credentials file uploaded successfully.')
      setTimeout(() => setUploadSuccess(null), 5000)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(index) {
    setDeleting(index)
    try {
      await deleteGoogleCredential(index)
      const updated = await fetchGoogleCredentials()
      setCredentials(updated)
      const paths = updated.map(c => c.path).join(',')
      onChange('GOOGLE_CREDENTIALS_JSON', paths)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="settings-group card">
      <div className="settings-group__head">
        <h3 className="settings-group__title">
          <span className="settings-group__icon"><AppIcon name={icon} className="icon" /></span>
          {t('settingsGroupGoogleCalendar')}
        </h3>
        <button
          type="button"
          className="settings-test-btn"
          onClick={() => onTest('google_calendar')}
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
        {/* Credentials file upload */}
        <div className="settings-field">
          <label className="settings-field__label">
            {t('settingsFieldGoogleCredentialsJson') || 'Google Credentials File'}
          </label>
          <span className="settings-field__desc">
            {t('settingsFieldGoogleCredentialsJsonDesc') || 'Upload your OAuth2 credentials.json file from Google Cloud Console.'}
          </span>
          <div className="settings-upload-row">
            <label className="btn settings-upload-btn" aria-label={t('uploadFile') || 'Upload file'}>
              <AppIcon name="upload" className="settings-upload__icon" />
              {uploading ? (t('uploading') || 'Uploading…') : (t('uploadCredentialsFile') || 'Upload credentials.json')}
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
          {uploadSuccess && (
            <p className="settings-test-result settings-test-result--success">{uploadSuccess}</p>
          )}
          {uploadError && (
            <p className="settings-test-result settings-test-result--error">{uploadError}</p>
          )}
        </div>

        {/* List of configured credentials */}
        {credentials.length > 0 && (
          <div className="settings-field">
            <span className="settings-field__label">
              {t('configuredGoogleAccounts') || 'Configured Google accounts'}
            </span>
            <div className="settings-account-list">
              {credentials.map((cred) => (
                <div key={cred.index} className="settings-account-item">
                  <div className="settings-account-item__info">
                    <AppIcon name="calendar" className="settings-account-item__icon" />
                    <div>
                      <span className="settings-account-item__name">{cred.filename}</span>
                      <span className={`settings-account-item__status ${cred.exists ? 'settings-account-item__status--ok' : 'settings-account-item__status--missing'}`}>
                        {cred.exists ? (t('fileFound') || '✓ File found') : (t('fileMissing') || '⚠ File missing')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="settings-account-item__delete"
                    onClick={() => handleDelete(cred.index)}
                    disabled={deleting === cred.index}
                    aria-label={t('removeAccount') || 'Remove'}
                  >
                    <AppIcon name="trash" className="settings-account-item__delete-icon" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Token file path */}
        <SettingField
          fieldKey="GOOGLE_TOKEN_JSON"
          label={t('settingsFieldGoogleTokenJson') || 'Token file path'}
          desc={t('settingsFieldGoogleTokenJsonDesc') || 'Path where the OAuth2 token is stored'}
          type="text"
          value={values.GOOGLE_TOKEN_JSON ?? ''}
          onChange={v => onChange('GOOGLE_TOKEN_JSON', v)}
        />
      </div>
    </div>
  )
}

/* ── Apple Calendar section ─────────────────────────────────────────────── */

function AppleCalendarSection({ icon, values, onChange, onTest, connectionState, t }) {
  const [accounts, setAccounts] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchCalDAVAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]))
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newUrl.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      await addCalDAVAccount({ url: newUrl.trim(), username: newUsername.trim(), password: newPassword })
      const updated = await fetchCalDAVAccounts()
      setAccounts(updated)
      setShowAddForm(false)
      setNewUrl('')
      setNewUsername('')
      setNewPassword('')
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(index) {
    setDeleting(index)
    try {
      await deleteCalDAVAccount(index)
      const updated = await fetchCalDAVAccounts()
      setAccounts(updated)
    } catch {
      // ignore
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="settings-group card">
      <div className="settings-group__head">
        <h3 className="settings-group__title">
          <span className="settings-group__icon"><AppIcon name={icon} className="icon" /></span>
          {t('settingsGroupAppleCalendar')}
        </h3>
        <button
          type="button"
          className="settings-test-btn"
          onClick={() => onTest('apple_calendar')}
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
        {/* List of configured accounts */}
        {accounts.length > 0 && (
          <div className="settings-field">
            <span className="settings-field__label">
              {t('configuredCalDAVAccounts') || 'Configured CalDAV accounts'}
            </span>
            <div className="settings-account-list">
              {accounts.map((acc) => (
                <div key={acc.index} className="settings-account-item">
                  <div className="settings-account-item__info">
                    <AppIcon name="calendar" className="settings-account-item__icon" />
                    <div>
                      <span className="settings-account-item__name">{acc.url}</span>
                      {acc.username && (
                        <span className="settings-account-item__status settings-account-item__status--ok">
                          {acc.username}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="settings-account-item__delete"
                    onClick={() => handleDelete(acc.index)}
                    disabled={deleting === acc.index}
                    aria-label={t('removeAccount') || 'Remove'}
                  >
                    <AppIcon name="trash" className="settings-account-item__delete-icon" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add account button / form */}
        {!showAddForm ? (
          <div className="settings-field">
            <button
              type="button"
              className="btn settings-add-account-btn"
              onClick={() => setShowAddForm(true)}
            >
              + {t('addCalDAVAccount') || 'Add CalDAV account'}
            </button>
          </div>
        ) : (
          <form className="settings-add-account-form settings-field" onSubmit={handleAdd}>
            <span className="settings-field__label">{t('addCalDAVAccount') || 'Add CalDAV account'}</span>
            <input
              className="settings-field__input"
              type="url"
              placeholder={t('caldavUrlPlaceholder') || 'CalDAV URL, e.g. https://caldav.icloud.com'}
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              required
            />
            <input
              className="settings-field__input"
              type="text"
              placeholder={t('caldavUsernamePlaceholder') || 'Username (Apple ID email)'}
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
            />
            <input
              className="settings-field__input"
              type="password"
              placeholder={t('caldavPasswordPlaceholder') || 'App-specific password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            {addError && <p className="settings-test-result settings-test-result--error">{addError}</p>}
            <div className="settings-add-account-form__actions">
              <button type="submit" className="btn" disabled={adding}>
                {adding ? (t('saving') || 'Saving…') : (t('addAccount') || 'Add account')}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => { setShowAddForm(false); setAddError(null) }}
              >
                {t('cancel') || 'Cancel'}
              </button>
            </div>
          </form>
        )}
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
