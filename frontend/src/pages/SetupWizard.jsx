import { useState } from 'react'
import { saveSettings } from '../api.js'
import { useI18n } from '../i18n.jsx'
import './SetupWizard.css'

const TOTAL_STEPS = 6

/**
 * Multi-step first-run setup wizard.
 *
 * Guides the user through configuring general settings, weather, AI,
 * notifications, and CalDAV calendar, then marks setup as complete.
 *
 * @param {{ onComplete: () => void, onLanguageChange?: (lang: string) => void }} props
 */
export default function SetupWizard({ onComplete, onLanguageChange }) {
  const { t } = useI18n()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    APP_TIMEZONE: 'Europe/Berlin',
    APP_LANGUAGE: 'en',
    DAILY_SUMMARY_TIME: '07:00',
    WEATHERAPI_API_KEY: '',
    WEATHER_CITY: '',
    WEATHER_UNITS: 'metric',
    AI_PROVIDER: 'openai',
    AI_MODEL: '',
    OPENAI_API_KEY: '',
    OPENAI_MODEL: 'gpt-4o-mini',
    GITHUB_TOKEN: '',
    NTFY_SERVER: 'https://ntfy.sh',
    NTFY_TOPIC: '',
    NTFY_TOKEN: '',
    CALDAV_URL: '',
    CALDAV_USERNAME: '',
    CALDAV_PASSWORD: '',
  })

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function saveStep(extraUpdates = {}) {
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, ...extraUpdates }
      await saveSettings(payload)
      if (onLanguageChange) {
        onLanguageChange(payload.APP_LANGUAGE === 'de' ? 'de' : 'en')
      }
    } catch (err) {
      setError(t('setupSaveError'))
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleNext() {
    try {
      await saveStep()
      setStep(s => s + 1)
    } catch {
      // error already set
    }
  }

  async function handleComplete() {
    try {
      await saveStep({ SETUP_COMPLETE: true })
      onComplete()
    } catch {
      // error already set
    }
  }

  async function handleSkip() {
    setSaving(true)
    setError(null)
    try {
      await saveSettings({ SETUP_COMPLETE: true })
      onComplete()
    } catch {
      setError(t('setupSaveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleFinish() {
    try {
      await saveStep()
      setStep(TOTAL_STEPS)
    } catch {
      // error already set
    }
  }

  const progress = Math.round((step / TOTAL_STEPS) * 100)

  return (
    <div className="wizard-overlay">
      <div className="wizard">
        {/* Header */}
        <div className="wizard__header">
          <img src="/favicon.svg" alt="DayPilot" className="wizard__logo" />
          <h1 className="wizard__title">{t('setupTitle')}</h1>
          {step > 0 && step < TOTAL_STEPS && (
            <span className="wizard__step-count">{t('stepOf', { step, total: TOTAL_STEPS - 1 })}</span>
          )}
        </div>

        {/* Progress bar */}
        {step > 0 && step < TOTAL_STEPS && (
          <div className="wizard__progress" aria-label={t('setupProgress', { progress })}>
            <div className="wizard__progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="wizard__error" role="alert">{error}</div>
        )}

        {/* Step content */}
        <div className="wizard__body">
          {step === 0 && <StepWelcome onStart={() => setStep(1)} onSkip={handleSkip} saving={saving} t={t} />}
          {step === 1 && <StepGeneral form={form} set={set} t={t} />}
          {step === 2 && <StepWeather form={form} set={set} t={t} />}
          {step === 3 && <StepAI form={form} set={set} t={t} />}
          {step === 4 && <StepNotifications form={form} set={set} t={t} />}
          {step === 5 && <StepCalendar form={form} set={set} t={t} />}
          {step === TOTAL_STEPS && <StepDone onComplete={handleComplete} saving={saving} t={t} />}
        </div>

        {/* Navigation buttons */}
        {step > 0 && step < TOTAL_STEPS && (
          <div className="wizard__footer">
            <button
              className="btn btn--ghost"
              onClick={() => setStep(s => s - 1)}
              disabled={saving}
            >
              ← {t('back')}
            </button>
            <button
              className="btn"
              onClick={step === TOTAL_STEPS - 1 ? handleFinish : handleNext}
              disabled={saving}
            >
              {saving ? t('save') : step === TOTAL_STEPS - 1 ? `${t('finish')} →` : `${t('next')} →`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Individual step components ────────────────────────────────────────────── */

function StepWelcome({ onStart, onSkip, saving, t }) {
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">🧭</div>
      <h2 className="wizard-step__title">{t('welcomeTitle')}</h2>
      <p className="wizard-step__desc">
        {t('welcomeDesc')}
      </p>
      <div className="wizard-step__actions">
        <button className="btn btn--large" onClick={onStart} disabled={saving}>
          {t('getStarted')} →
        </button>
        <button className="btn btn--ghost" onClick={onSkip} disabled={saving}>
          {t('skipSetup')}
        </button>
      </div>
    </div>
  )
}

function StepGeneral({ form, set, t }) {
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">🌍</div>
      <h2 className="wizard-step__title">{t('setupGeneralTitle')}</h2>
      <p className="wizard-step__desc">
        {t('setupGeneralDesc')}
      </p>
      <div className="wizard-step__fields">
        <Field
          label={t('settingsFieldAppTimezone')}
          hint={t('settingsFieldAppTimezoneDesc')}
          value={form.APP_TIMEZONE}
          onChange={v => set('APP_TIMEZONE', v)}
        />
        <SelectField
          label={t('settingsFieldAppLanguage')}
          hint={t('settingsFieldAppLanguageDesc')}
          value={form.APP_LANGUAGE}
          onChange={v => set('APP_LANGUAGE', v)}
          options={[
            { value: 'en', label: t('languageEnglish') },
            { value: 'de', label: t('languageGerman') },
          ]}
        />
        <Field
          label={t('settingsFieldDailyBriefingTime')}
          hint={t('setupGeneralBriefingHint')}
          type="time"
          value={form.DAILY_SUMMARY_TIME}
          onChange={v => set('DAILY_SUMMARY_TIME', v)}
        />
      </div>
    </div>
  )
}

function StepWeather({ form, set, t }) {
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">🌤️</div>
      <h2 className="wizard-step__title">{t('setupWeatherTitle')}</h2>
      <p className="wizard-step__desc">
        {t('setupWeatherDesc1')}{' '}
        <a href="https://www.weatherapi.com/" target="_blank" rel="noreferrer">
          weatherapi.com
        </a>
        {t('setupWeatherDesc2')}
      </p>
      <div className="wizard-step__fields">
        <Field
          label={t('settingsFieldWeatherApiKey')}
          hint={t('settingsFieldWeatherApiKeyDesc')}
          type="password"
          value={form.WEATHERAPI_API_KEY}
          onChange={v => set('WEATHERAPI_API_KEY', v)}
        />
        <Field
          label={t('settingsFieldCity')}
          hint={t('setupWeatherCityHint')}
          value={form.WEATHER_CITY}
          onChange={v => set('WEATHER_CITY', v)}
        />
        <SelectField
          label={t('settingsFieldUnits')}
          hint={t('settingsFieldUnitsDesc')}
          value={form.WEATHER_UNITS}
          onChange={v => set('WEATHER_UNITS', v)}
          options={[
            { value: 'metric', label: t('metricUnits') },
            { value: 'imperial', label: t('imperialUnits') },
          ]}
        />
      </div>
    </div>
  )
}

function StepAI({ form, set, t }) {
  const isOpenAI = form.AI_PROVIDER === 'openai'
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">🤖</div>
      <h2 className="wizard-step__title">{t('setupAiTitle')}</h2>
      <p className="wizard-step__desc">
        {t('setupAiDesc')}
      </p>
      <div className="wizard-step__fields">
        <SelectField
          label={t('settingsAiProviderLabel')}
          hint={t('setupAiProviderHint')}
          value={form.AI_PROVIDER}
          onChange={v => set('AI_PROVIDER', v)}
          options={[
            { value: 'openai', label: t('settingsAiProviderOpenAi') },
            { value: 'github', label: t('settingsAiProviderGithub') },
          ]}
        />
        {isOpenAI ? (
          <>
            <Field
              label={t('settingsAiOpenAiKeyLabel')}
              hint={t('settingsAiOpenAiKeyDesc')}
              type="password"
              value={form.OPENAI_API_KEY}
              onChange={v => set('OPENAI_API_KEY', v)}
            />
            <Field
              label={t('settingsAiModelLabel')}
              hint={t('setupAiModelHintOpenAi')}
              value={form.OPENAI_MODEL}
              onChange={v => set('OPENAI_MODEL', v)}
            />
          </>
        ) : (
          <>
            <Field
              label={t('setupAiGithubTokenLabel')}
              hint={t('setupAiGithubTokenHint')}
              type="password"
              value={form.GITHUB_TOKEN}
              onChange={v => set('GITHUB_TOKEN', v)}
            />
            <Field
              label={t('settingsAiModelLabel')}
              hint={t('setupAiModelHintGithub')}
              value={form.AI_MODEL}
              onChange={v => set('AI_MODEL', v)}
            />
          </>
        )}
      </div>
    </div>
  )
}

function StepNotifications({ form, set, t }) {
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">🔔</div>
      <h2 className="wizard-step__title">{t('setupNotificationsTitle')}</h2>
      <p className="wizard-step__desc">
        {t('setupNotificationsDesc1')}{' '}
        <a href="https://ntfy.sh" target="_blank" rel="noreferrer">ntfy.sh</a>
        {t('setupNotificationsDesc2')}
      </p>
      <div className="wizard-step__fields">
        <Field
          label={t('settingsFieldNtfyServer')}
          hint={t('settingsFieldNtfyServerDesc')}
          value={form.NTFY_SERVER}
          onChange={v => set('NTFY_SERVER', v)}
        />
        <Field
          label={t('settingsFieldTopic')}
          hint={t('setupNotificationsTopicHint')}
          value={form.NTFY_TOPIC}
          onChange={v => set('NTFY_TOPIC', v)}
        />
        <Field
          label={t('settingsFieldTokenOptional')}
          hint={t('settingsFieldTokenOptionalDesc')}
          type="password"
          value={form.NTFY_TOKEN}
          onChange={v => set('NTFY_TOKEN', v)}
        />
      </div>
    </div>
  )
}

function StepCalendar({ form, set, t }) {
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">📅</div>
      <h2 className="wizard-step__title">{t('setupCalendarTitle')}</h2>
      <p className="wizard-step__desc">
        {t('setupCalendarDesc1')}{' '}
        <a
          href="https://appleid.apple.com/account/manage"
          target="_blank"
          rel="noreferrer"
        >
          {t('settingsFieldAppSpecificPassword')}
        </a>{' '}
        {t('setupCalendarDesc2')}
      </p>
      <div className="wizard-step__note">
        <span>📌</span>
        <span>
          <strong>{t('settingsICalCalendarTitle')}</strong> {t('setupCalendarICalNote1')}{' '}
          <a href="/docs/features/briefing.md" target="_blank" rel="noreferrer">
            {t('setupCalendarDocs')}
          </a>{' '}
          {t('setupCalendarICalNote2')}
        </span>
      </div>
      <div className="wizard-step__fields">
        <Field
          label={t('settingsFieldCaldavUrl')}
          hint={t('settingsFieldCaldavUrlDesc')}
          value={form.CALDAV_URL}
          onChange={v => set('CALDAV_URL', v)}
        />
        <Field
          label={t('setupCalendarIcloudUsernameLabel')}
          hint={t('settingsFieldUsernameDesc')}
          value={form.CALDAV_USERNAME}
          onChange={v => set('CALDAV_USERNAME', v)}
        />
        <Field
          label={t('settingsFieldAppSpecificPassword')}
          hint={t('setupCalendarAppPasswordHint')}
          type="password"
          value={form.CALDAV_PASSWORD}
          onChange={v => set('CALDAV_PASSWORD', v)}
        />
      </div>
    </div>
  )
}

function StepDone({ onComplete, saving, t }) {
  return (
    <div className="wizard-step wizard-step--done">
      <div className="wizard-step__icon">🎉</div>
      <h2 className="wizard-step__title">{t('setupDoneTitle')}</h2>
      <p className="wizard-step__desc">
        {t('setupDoneDesc1')} <strong>{t('settingsTitle')}</strong> {t('setupDoneDesc2')}
      </p>
      <button className="btn btn--large" onClick={onComplete} disabled={saving}>
        {saving ? t('setupStarting') : `${t('setupStartUsing')} →`}
      </button>
    </div>
  )
}

/* ── Shared field primitives ─────────────────────────────────────────────── */

function Field({ label, hint, value, onChange, type = 'text' }) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="wizard-field">
      <label className="wizard-field__label" htmlFor={id}>{label}</label>
      {hint && <span className="wizard-field__hint">{hint}</span>}
      <input
        id={id}
        className="wizard-field__input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  )
}

function SelectField({ label, hint, value, onChange, options }) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="wizard-field">
      <label className="wizard-field__label" htmlFor={id}>{label}</label>
      {hint && <span className="wizard-field__hint">{hint}</span>}
      <select
        id={id}
        className="wizard-field__input wizard-field__select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
