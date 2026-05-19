import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Bell, Bot, Calendar, CheckCircle2, Cloud, Globe, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addICalUrl, saveSettings } from '@/lib/api'
import { useI18n } from '@/i18n.jsx'

interface SetupWizardProps {
  onComplete: () => void
  onLanguageChange?: (lang: string) => void
}

interface SetupForm {
  APP_TIMEZONE: string
  APP_LANGUAGE: string
  DAILY_SUMMARY_TIME: string
  WEATHERAPI_API_KEY: string
  WEATHER_CITY: string
  WEATHER_UNITS: string
  AI_PROVIDER: string
  AI_MODEL: string
  OPENAI_API_KEY: string
  OPENAI_MODEL: string
  GITHUB_TOKEN: string
  NTFY_SERVER: string
  NTFY_TOPIC: string
  NTFY_TOKEN: string
  ICAL_URL: string
  CALDAV_URL: string
  CALDAV_USERNAME: string
  CALDAV_PASSWORD: string
}

const INITIAL_FORM: SetupForm = {
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
  ICAL_URL: '',
  CALDAV_URL: '',
  CALDAV_USERNAME: '',
  CALDAV_PASSWORD: '',
}

const TOTAL_STEPS = 7

export default function SetupWizard({ onComplete, onLanguageChange }: SetupWizardProps): JSX.Element {
  const { t } = useI18n()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SetupForm>(INITIAL_FORM)

  function set<K extends keyof SetupForm>(key: K, value: SetupForm[K]): void {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function saveStep(extraUpdates: Record<string, unknown> = {}): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      const { ICAL_URL, ...rest } = form
      const payload = { ...rest, ...extraUpdates }
      await saveSettings(payload)
      if (onLanguageChange) {
        onLanguageChange(payload.APP_LANGUAGE === 'de' ? 'de' : 'en')
      }
      if (ICAL_URL && ICAL_URL.trim()) {
        try {
          await addICalUrl(ICAL_URL.trim())
        } catch (icalErr) {
          // Non-fatal: user can add the feed later in Settings.
          console.error('Failed to add iCal URL during setup:', icalErr)
        }
      }
    } catch (err) {
      setError(t('setupSaveError'))
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleNext(): Promise<void> {
    try {
      await saveStep()
      setStep(s => s + 1)
    } catch {
      // error state already set
    }
  }

  async function handleComplete(): Promise<void> {
    try {
      await saveStep({ SETUP_COMPLETE: true })
      onComplete()
    } catch {
      // error state already set
    }
  }

  async function handleSkip(): Promise<void> {
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

  async function handleFinish(): Promise<void> {
    try {
      await saveStep()
      setStep(TOTAL_STEPS)
    } catch {
      // error state already set
    }
  }

  const progress = Math.round((step / TOTAL_STEPS) * 100)
  const showProgress = step > 0 && step < TOTAL_STEPS

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl bg-surface-container rounded-3xl shadow-elev3 p-6 sm:p-10 space-y-6">
          {/* Header */}
          <header className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="DayPilot" className="w-10 h-10" />
              <h1 className="text-headline-sm text-foreground">{t('setupTitle')}</h1>
              {showProgress && (
                <span className="ml-auto text-label-md text-muted-foreground">
                  {t('stepOf', { step, total: TOTAL_STEPS - 1 })}
                </span>
              )}
            </div>
            {showProgress && (
              <Progress
                value={progress}
                aria-label={t('setupProgress', { progress })}
              />
            )}
          </header>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="rounded-2xl bg-error-container text-error-container-foreground px-4 py-3 text-body-sm"
            >
              {error}
            </div>
          )}

          {/* Step content */}
          <div className="min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {step === 0 && <StepWelcome onStart={() => setStep(1)} onSkip={handleSkip} saving={saving} />}
                {step === 1 && <StepGeneral form={form} set={set} />}
                {step === 2 && <StepWeather form={form} set={set} />}
                {step === 3 && <StepAI form={form} set={set} />}
                {step === 4 && <StepNotifications form={form} set={set} />}
                {step === 5 && <StepGoogleCalendar form={form} set={set} />}
                {step === 6 && <StepCalendar form={form} set={set} />}
                {step === TOTAL_STEPS && <StepDone onComplete={handleComplete} saving={saving} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          {showProgress && (
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-outline-variant">
              <Button
                variant="text"
                onClick={() => setStep(s => s - 1)}
                disabled={saving}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('back')}
              </Button>
              <Button
                variant="filled"
                onClick={step === TOTAL_STEPS - 1 ? handleFinish : handleNext}
                disabled={saving}
                className="gap-2"
              >
                {saving ? t('save') : step === TOTAL_STEPS - 1 ? t('finish') : t('next')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Step components ─────────────────────────────────────────────────────── */

interface StepFormProps {
  form: SetupForm
  set: <K extends keyof SetupForm>(key: K, value: SetupForm[K]) => void
}

function StepHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Globe
  title: string
  description: React.ReactNode
}): JSX.Element {
  return (
    <div className="text-center space-y-3 mb-6">
      <div className="mx-auto inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-container text-primary-container-foreground">
        <Icon className="w-8 h-8" />
      </div>
      <h2 className="text-headline-sm text-foreground">{title}</h2>
      <p className="text-body-md text-muted-foreground">{description}</p>
    </div>
  )
}

function StepWelcome({
  onStart,
  onSkip,
  saving,
}: {
  onStart: () => void
  onSkip: () => void
  saving: boolean
}): JSX.Element {
  const { t } = useI18n()
  return (
    <div className="text-center space-y-6 py-6">
      <div className="mx-auto inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary-container text-primary-container-foreground shadow-elev2">
        <PartyPopper className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-headline-md text-foreground">{t('welcomeTitle')}</h2>
        <p className="text-body-lg text-muted-foreground max-w-md mx-auto">{t('welcomeDesc')}</p>
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        <Button size="lg" onClick={onStart} disabled={saving} className="gap-2">
          {t('getStarted')} <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="text" onClick={onSkip} disabled={saving}>
          {t('skipSetup')}
        </Button>
      </div>
    </div>
  )
}

function StepGeneral({ form, set }: StepFormProps): JSX.Element {
  const { t } = useI18n()
  return (
    <div>
      <StepHeader icon={Globe} title={t('setupGeneralTitle')} description={t('setupGeneralDesc')} />
      <div className="space-y-4">
        <WizField
          id="tz"
          label={t('settingsFieldAppTimezone')}
          hint={t('settingsFieldAppTimezoneDesc')}
          value={form.APP_TIMEZONE}
          onChange={v => set('APP_TIMEZONE', v)}
        />
        <WizSelect
          id="lang"
          label={t('settingsFieldAppLanguage')}
          hint={t('settingsFieldAppLanguageDesc')}
          value={form.APP_LANGUAGE}
          onChange={v => set('APP_LANGUAGE', v)}
          options={[
            { value: 'en', label: t('languageEnglish') },
            { value: 'de', label: t('languageGerman') },
          ]}
        />
        <WizField
          id="brief"
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

function StepWeather({ form, set }: StepFormProps): JSX.Element {
  const { t } = useI18n()
  return (
    <div>
      <StepHeader
        icon={Cloud}
        title={t('setupWeatherTitle')}
        description={
          <>
            {t('setupWeatherDesc1')}{' '}
            <a href="https://www.weatherapi.com/" target="_blank" rel="noreferrer" className="text-primary underline">
              weatherapi.com
            </a>
            {t('setupWeatherDesc2')}
          </>
        }
      />
      <div className="space-y-4">
        <WizField
          id="weather-key"
          label={t('settingsFieldWeatherApiKey')}
          hint={t('settingsFieldWeatherApiKeyDesc')}
          type="password"
          value={form.WEATHERAPI_API_KEY}
          onChange={v => set('WEATHERAPI_API_KEY', v)}
        />
        <WizField
          id="weather-city"
          label={t('settingsFieldCity')}
          hint={t('setupWeatherCityHint')}
          value={form.WEATHER_CITY}
          onChange={v => set('WEATHER_CITY', v)}
        />
        <WizSelect
          id="weather-units"
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

function StepAI({ form, set }: StepFormProps): JSX.Element {
  const { t } = useI18n()
  const isOpenAI = form.AI_PROVIDER === 'openai'
  return (
    <div>
      <StepHeader icon={Bot} title={t('setupAiTitle')} description={t('setupAiDesc')} />
      <div className="space-y-4">
        <WizSelect
          id="ai-provider"
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
            <WizField
              id="ai-openai-key"
              label={t('settingsAiOpenAiKeyLabel')}
              hint={t('settingsAiOpenAiKeyDesc')}
              type="password"
              value={form.OPENAI_API_KEY}
              onChange={v => set('OPENAI_API_KEY', v)}
            />
            <WizField
              id="ai-openai-model"
              label={t('settingsAiModelLabel')}
              hint={t('setupAiModelHintOpenAi')}
              value={form.OPENAI_MODEL}
              onChange={v => set('OPENAI_MODEL', v)}
            />
          </>
        ) : (
          <>
            <WizField
              id="ai-gh-token"
              label={t('setupAiGithubTokenLabel')}
              hint={t('setupAiGithubTokenHint')}
              type="password"
              value={form.GITHUB_TOKEN}
              onChange={v => set('GITHUB_TOKEN', v)}
            />
            <WizField
              id="ai-gh-model"
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

function StepNotifications({ form, set }: StepFormProps): JSX.Element {
  const { t } = useI18n()
  return (
    <div>
      <StepHeader
        icon={Bell}
        title={t('setupNotificationsTitle')}
        description={
          <>
            {t('setupNotificationsDesc1')}{' '}
            <a href="https://ntfy.sh" target="_blank" rel="noreferrer" className="text-primary underline">
              ntfy.sh
            </a>
            {t('setupNotificationsDesc2')}
          </>
        }
      />
      <div className="space-y-4">
        <WizField
          id="ntfy-server"
          label={t('settingsFieldNtfyServer')}
          hint={t('settingsFieldNtfyServerDesc')}
          value={form.NTFY_SERVER}
          onChange={v => set('NTFY_SERVER', v)}
        />
        <WizField
          id="ntfy-topic"
          label={t('settingsFieldTopic')}
          hint={t('setupNotificationsTopicHint')}
          value={form.NTFY_TOPIC}
          onChange={v => set('NTFY_TOPIC', v)}
        />
        <WizField
          id="ntfy-token"
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

function StepGoogleCalendar({ form, set }: StepFormProps): JSX.Element {
  const { t } = useI18n()
  return (
    <div>
      <StepHeader
        icon={Calendar}
        title={t('setupGoogleCalendarTitle')}
        description={t('setupGoogleCalendarDesc')}
      />
      <ol className="space-y-1.5 mb-5 text-body-sm text-muted-foreground list-decimal list-inside">
        <li>{t('setupGoogleCalendarStep1')}</li>
        <li>{t('setupGoogleCalendarStep2')}</li>
        <li>{t('setupGoogleCalendarStep3')}</li>
      </ol>
      <div className="space-y-4">
        <WizField
          id="ical-url"
          label={t('setupGoogleCalendarUrlLabel')}
          hint={t('setupGoogleCalendarUrlHint')}
          value={form.ICAL_URL}
          onChange={v => set('ICAL_URL', v)}
        />
        <p className="text-body-sm text-muted-foreground">{t('setupGoogleCalendarSkipHint')}</p>
      </div>
    </div>
  )
}

function StepCalendar({ form, set }: StepFormProps): JSX.Element {
  const { t } = useI18n()
  return (
    <div>
      <StepHeader
        icon={Calendar}
        title={t('setupCalendarTitle')}
        description={
          <>
            {t('setupCalendarDesc1')}{' '}
            <a
              href="https://appleid.apple.com/account/manage"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              {t('settingsFieldAppSpecificPassword')}
            </a>{' '}
            {t('setupCalendarDesc2')}
          </>
        }
      />
      <div className="rounded-2xl bg-surface-container-high p-4 text-body-sm text-muted-foreground mb-5">
        <strong className="text-foreground">{t('settingsICalCalendarTitle')}</strong>{' '}
        {t('setupCalendarICalNote1')}{' '}
        <a href="/docs/features/briefing.md" target="_blank" rel="noreferrer" className="text-primary underline">
          {t('setupCalendarDocs')}
        </a>{' '}
        {t('setupCalendarICalNote2')}
      </div>
      <div className="space-y-4">
        <WizField
          id="caldav-url"
          label={t('settingsFieldCaldavUrl')}
          hint={t('settingsFieldCaldavUrlDesc')}
          value={form.CALDAV_URL}
          onChange={v => set('CALDAV_URL', v)}
        />
        <WizField
          id="caldav-user"
          label={t('setupCalendarIcloudUsernameLabel')}
          hint={t('settingsFieldUsernameDesc')}
          value={form.CALDAV_USERNAME}
          onChange={v => set('CALDAV_USERNAME', v)}
        />
        <WizField
          id="caldav-pwd"
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

function StepDone({ onComplete, saving }: { onComplete: () => void; saving: boolean }): JSX.Element {
  const { t } = useI18n()
  return (
    <div className="text-center space-y-6 py-6">
      <div className="mx-auto inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-success-container text-success-container-foreground shadow-elev2">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-headline-md text-foreground">{t('setupDoneTitle')}</h2>
        <p className="text-body-lg text-muted-foreground max-w-md mx-auto">
          {t('setupDoneDesc1')} <strong className="text-foreground">{t('settingsTitle')}</strong>{' '}
          {t('setupDoneDesc2')}
        </p>
      </div>
      <Button size="lg" onClick={onComplete} disabled={saving} className="gap-2">
        {saving ? t('setupStarting') : t('setupStartUsing')}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

/* ── Shared field primitives ────────────────────────────────────────────── */

interface WizFieldProps {
  id: string
  label: string
  hint?: string
  type?: string
  value: string
  onChange: (value: string) => void
}

function WizField({ id, label, hint, type = 'text', value, onChange }: WizFieldProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="text-body-sm text-muted-foreground">{hint}</p>}
      <Input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  )
}

interface WizSelectProps {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

function WizSelect({ id, label, hint, value, onChange, options }: WizSelectProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="text-body-sm text-muted-foreground">{hint}</p>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
