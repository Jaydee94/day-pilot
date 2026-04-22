import { useState } from 'react'
import { saveSettings } from '../api.js'
import './SetupWizard.css'

const TOTAL_STEPS = 6

/**
 * Multi-step first-run setup wizard.
 *
 * Guides the user through configuring general settings, weather, AI,
 * notifications, and CalDAV calendar, then marks setup as complete.
 *
 * @param {{ onComplete: () => void }} props
 */
export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    APP_TIMEZONE: 'Europe/Berlin',
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
      await saveSettings({ ...form, ...extraUpdates })
    } catch (err) {
      setError('Could not save settings. Please try again.')
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
      setError('Could not save settings. Please try again.')
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
          <h1 className="wizard__title">DayPilot Setup</h1>
          {step > 0 && step < TOTAL_STEPS && (
            <span className="wizard__step-count">Step {step} of {TOTAL_STEPS - 1}</span>
          )}
        </div>

        {/* Progress bar */}
        {step > 0 && step < TOTAL_STEPS && (
          <div className="wizard__progress" aria-label={`Setup progress: ${progress}%`}>
            <div className="wizard__progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="wizard__error" role="alert">{error}</div>
        )}

        {/* Step content */}
        <div className="wizard__body">
          {step === 0 && <StepWelcome onStart={() => setStep(1)} onSkip={handleSkip} saving={saving} />}
          {step === 1 && <StepGeneral form={form} set={set} />}
          {step === 2 && <StepWeather form={form} set={set} />}
          {step === 3 && <StepAI form={form} set={set} />}
          {step === 4 && <StepNotifications form={form} set={set} />}
          {step === 5 && <StepCalendar form={form} set={set} />}
          {step === TOTAL_STEPS && <StepDone onComplete={handleComplete} saving={saving} />}
        </div>

        {/* Navigation buttons */}
        {step > 0 && step < TOTAL_STEPS && (
          <div className="wizard__footer">
            <button
              className="btn btn--ghost"
              onClick={() => setStep(s => s - 1)}
              disabled={saving}
            >
              ← Back
            </button>
            <button
              className="btn"
              onClick={step === TOTAL_STEPS - 1 ? handleFinish : handleNext}
              disabled={saving}
            >
              {saving ? 'Saving…' : step === TOTAL_STEPS - 1 ? 'Finish →' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Individual step components ────────────────────────────────────────────── */

function StepWelcome({ onStart, onSkip, saving }) {
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">🧭</div>
      <h2 className="wizard-step__title">Welcome to DayPilot!</h2>
      <p className="wizard-step__desc">
        Your personal AI-powered daily co-pilot. Let's take a few minutes to
        set things up so DayPilot can give you the most helpful briefings and
        suggestions every morning.
      </p>
      <div className="wizard-step__actions">
        <button className="btn btn--large" onClick={onStart} disabled={saving}>
          Get started →
        </button>
        <button className="btn btn--ghost" onClick={onSkip} disabled={saving}>
          Skip setup, I'll configure manually
        </button>
      </div>
    </div>
  )
}

function StepGeneral({ form, set }) {
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">🌍</div>
      <h2 className="wizard-step__title">General Settings</h2>
      <p className="wizard-step__desc">
        Tell DayPilot where you are and when you'd like your daily briefing.
      </p>
      <div className="wizard-step__fields">
        <Field
          label="Timezone"
          hint="e.g. Europe/Berlin, America/New_York"
          value={form.APP_TIMEZONE}
          onChange={v => set('APP_TIMEZONE', v)}
        />
        <Field
          label="Daily briefing time"
          hint="When should DayPilot generate and send your morning summary? (HH:MM)"
          type="time"
          value={form.DAILY_SUMMARY_TIME}
          onChange={v => set('DAILY_SUMMARY_TIME', v)}
        />
      </div>
    </div>
  )
}

function StepWeather({ form, set }) {
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">🌤️</div>
      <h2 className="wizard-step__title">Weather</h2>
      <p className="wizard-step__desc">
        DayPilot uses WeatherAPI to include weather in your daily briefing.
        Get a free API key at{' '}
        <a href="https://www.weatherapi.com/" target="_blank" rel="noreferrer">
          weatherapi.com
        </a>
        .
      </p>
      <div className="wizard-step__fields">
        <Field
          label="WeatherAPI key"
          hint="Your free API key from weatherapi.com"
          type="password"
          value={form.WEATHERAPI_API_KEY}
          onChange={v => set('WEATHERAPI_API_KEY', v)}
        />
        <Field
          label="City"
          hint="Your city name, e.g. Berlin"
          value={form.WEATHER_CITY}
          onChange={v => set('WEATHER_CITY', v)}
        />
        <SelectField
          label="Units"
          hint="Temperature unit"
          value={form.WEATHER_UNITS}
          onChange={v => set('WEATHER_UNITS', v)}
          options={[
            { value: 'metric', label: 'Metric (°C)' },
            { value: 'imperial', label: 'Imperial (°F)' },
          ]}
        />
      </div>
    </div>
  )
}

function StepAI({ form, set }) {
  const isOpenAI = form.AI_PROVIDER === 'openai'
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">🤖</div>
      <h2 className="wizard-step__title">AI Configuration</h2>
      <p className="wizard-step__desc">
        DayPilot uses an AI model to generate your personalised daily briefing
        and planning suggestions.
      </p>
      <div className="wizard-step__fields">
        <SelectField
          label="AI Provider"
          hint="Choose between OpenAI or GitHub Models"
          value={form.AI_PROVIDER}
          onChange={v => set('AI_PROVIDER', v)}
          options={[
            { value: 'openai', label: 'OpenAI (GPT)' },
            { value: 'github', label: 'GitHub Models' },
          ]}
        />
        {isOpenAI ? (
          <>
            <Field
              label="OpenAI API key"
              hint="Your key from platform.openai.com"
              type="password"
              value={form.OPENAI_API_KEY}
              onChange={v => set('OPENAI_API_KEY', v)}
            />
            <Field
              label="Model"
              hint="e.g. gpt-4o-mini, gpt-4o"
              value={form.OPENAI_MODEL}
              onChange={v => set('OPENAI_MODEL', v)}
            />
          </>
        ) : (
          <>
            <Field
              label="GitHub Personal Access Token"
              hint="A token with the models:read permission from github.com/settings/tokens"
              type="password"
              value={form.GITHUB_TOKEN}
              onChange={v => set('GITHUB_TOKEN', v)}
            />
            <Field
              label="Model"
              hint="e.g. gpt-4o, Meta-Llama-3.1-70B-Instruct (leave blank for default)"
              value={form.AI_MODEL}
              onChange={v => set('AI_MODEL', v)}
            />
          </>
        )}
      </div>
    </div>
  )
}

function StepNotifications({ form, set }) {
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">🔔</div>
      <h2 className="wizard-step__title">Push Notifications</h2>
      <p className="wizard-step__desc">
        DayPilot sends your morning briefing and contextual alerts via{' '}
        <a href="https://ntfy.sh" target="_blank" rel="noreferrer">ntfy.sh</a>
        . Create a free topic at ntfy.sh or use your own self-hosted server.
      </p>
      <div className="wizard-step__fields">
        <Field
          label="ntfy server"
          hint="e.g. https://ntfy.sh or your self-hosted URL"
          value={form.NTFY_SERVER}
          onChange={v => set('NTFY_SERVER', v)}
        />
        <Field
          label="Topic"
          hint="Your ntfy topic name (e.g. my-daypilot-alerts)"
          value={form.NTFY_TOPIC}
          onChange={v => set('NTFY_TOPIC', v)}
        />
        <Field
          label="Token (optional)"
          hint="Bearer token for private ntfy topics"
          type="password"
          value={form.NTFY_TOKEN}
          onChange={v => set('NTFY_TOKEN', v)}
        />
      </div>
    </div>
  )
}

function StepCalendar({ form, set }) {
  return (
    <div className="wizard-step">
      <div className="wizard-step__icon">📅</div>
      <h2 className="wizard-step__title">Calendar (Apple / iCloud)</h2>
      <p className="wizard-step__desc">
        Connect your Apple iCloud calendar via CalDAV. Use an{' '}
        <a
          href="https://appleid.apple.com/account/manage"
          target="_blank"
          rel="noreferrer"
        >
          App-Specific Password
        </a>{' '}
        — not your regular iCloud password.
      </p>
      <div className="wizard-step__note">
        <span>📌</span>
        <span>
          <strong>Google Calendar</strong> requires placing an OAuth2
          credentials file on the server. See the{' '}
          <a href="/docs/features/briefing.md" target="_blank" rel="noreferrer">
            documentation
          </a>{' '}
          for details.
        </span>
      </div>
      <div className="wizard-step__fields">
        <Field
          label="CalDAV URL"
          hint="e.g. https://caldav.icloud.com"
          value={form.CALDAV_URL}
          onChange={v => set('CALDAV_URL', v)}
        />
        <Field
          label="iCloud username"
          hint="Your Apple ID email address"
          value={form.CALDAV_USERNAME}
          onChange={v => set('CALDAV_USERNAME', v)}
        />
        <Field
          label="App-Specific Password"
          hint="Generated at appleid.apple.com → Sign-in and Security"
          type="password"
          value={form.CALDAV_PASSWORD}
          onChange={v => set('CALDAV_PASSWORD', v)}
        />
      </div>
    </div>
  )
}

function StepDone({ onComplete, saving }) {
  return (
    <div className="wizard-step wizard-step--done">
      <div className="wizard-step__icon">🎉</div>
      <h2 className="wizard-step__title">You're all set!</h2>
      <p className="wizard-step__desc">
        DayPilot is configured and ready to go. Your first morning briefing
        will be generated at the time you selected. You can change any of
        these settings at any time from the <strong>Settings</strong> page.
      </p>
      <button className="btn btn--large" onClick={onComplete} disabled={saving}>
        {saving ? 'Starting…' : 'Start using DayPilot →'}
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
