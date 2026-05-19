import { useEffect, useRef, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { fetchSettings, saveSettings, testIntegrationConnection } from '@/lib/api'
import type { UserSettings } from '@/lib/types'
import { useI18n } from '@/i18n.jsx'
import { GeneralTab } from '@/components/feature/settings/GeneralTab'
import { AITab } from '@/components/feature/settings/AITab'
import { IntegrationsTab } from '@/components/feature/settings/IntegrationsTab'
import { ICalTab } from '@/components/feature/settings/ICalTab'
import { FamilySettingsSection } from '@/components/feature/settings/FamilySettingsSection'
import { AdvancedTab } from '@/components/feature/settings/AdvancedTab'
import type { ConnectionMap, ConnectionState } from '@/components/feature/settings/shared'

interface SettingsPageProps {
  onLanguageChange?: (lang: string) => void
}

const TESTABLE_INTEGRATIONS = [
  'ai',
  'ical_calendar',
  'apple_calendar',
  'weather',
  'notifications',
  'voice_webhook',
] as const

type TabKey = 'general' | 'ai' | 'integrations' | 'ical' | 'family' | 'advanced'

export default function SettingsPage({ onLanguageChange }: SettingsPageProps): JSX.Element {
  const { t } = useI18n()
  const [values, setValues] = useState<UserSettings>({})
  const [initialValues, setInitialValues] = useState<UserSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [connections, setConnections] = useState<ConnectionMap>({})
  const [activeTab, setActiveTab] = useState<TabKey>('general')
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    fetchSettings()
      .then(data => {
        setValues(data)
        setInitialValues(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach(id => clearTimeout(id))
      timers.clear()
    }
  }, [])

  function scheduleTimeout(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      timersRef.current.delete(id)
      fn()
    }, ms)
    timersRef.current.add(id)
  }

  function handleChange(key: keyof UserSettings, value: string): void {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues)

  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      const updated = await saveSettings(values)
      setValues(updated)
      setInitialValues(updated)
      if (onLanguageChange) {
        onLanguageChange((updated.APP_LANGUAGE || values.APP_LANGUAGE) === 'de' ? 'de' : 'en')
      }
      toast.success(t('settingsSaved'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settingsSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection(integration: string): Promise<void> {
    if (!integration) return

    setConnections(prev => ({
      ...prev,
      [integration]: { loading: true, ok: null, message: t('connectionTesting') } as ConnectionState,
    }))

    try {
      const result = await testIntegrationConnection(integration, values)
      setConnections(prev => ({
        ...prev,
        [integration]: { loading: false, ok: result.ok, message: result.message },
      }))
      if (result.ok) {
        scheduleTimeout(() => {
          setConnections(prev => {
            if (!prev[integration]?.ok) return prev
            return { ...prev, [integration]: null }
          })
        }, 6000)
      }
    } catch (err) {
      setConnections(prev => ({
        ...prev,
        [integration]: {
          loading: false,
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        },
      }))
    }
  }

  async function handleTestAllConnections(): Promise<void> {
    for (const integration of TESTABLE_INTEGRATIONS) {
      await handleTestConnection(integration)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-display-sm text-foreground">{t('settingsTitle')}</h1>
          <p className="text-body-lg text-muted-foreground">{t('settingsLoading')}</p>
        </header>
        <div className="space-y-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-display-sm text-foreground">{t('settingsTitle')}</h1>
        </header>
        <ErrorState
          title={t('errorPrefix')}
          message={t('settingsLoadError', { error: loadError })}
          retryLabel={t('tryAgain')}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-28">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-display-sm text-foreground">{t('settingsTitle')}</h1>
          <p className="text-body-lg text-muted-foreground">{t('settingsSubtitle')}</p>
        </div>
        <Button
          variant="text"
          onClick={handleTestAllConnections}
          aria-label={t('testAllIntegrations')}
        >
          {t('testAllIntegrations')}
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="general">{t('settingsGroupGeneral')}</TabsTrigger>
          <TabsTrigger value="ai">{t('settingsAiProviderTitle')}</TabsTrigger>
          <TabsTrigger value="integrations">{t('settingsGroupWeather')}</TabsTrigger>
          <TabsTrigger value="ical">{t('settingsGroupICalCalendar')}</TabsTrigger>
          <TabsTrigger value="family">{t('familySectionTitle')}</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab values={values} onChange={handleChange} />
        </TabsContent>

        <TabsContent value="ai">
          <AITab
            values={values}
            onChange={handleChange}
            onTest={handleTestConnection}
            connections={connections}
          />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab
            values={values}
            onChange={handleChange}
            onTest={handleTestConnection}
            connections={connections}
          />
        </TabsContent>

        <TabsContent value="ical">
          <ICalTab
            onChange={handleChange}
            onTest={handleTestConnection}
            connections={connections}
          />
        </TabsContent>

        <TabsContent value="family">
          <FamilySettingsSection />
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedTab values={values} onChange={handleChange} />
        </TabsContent>
      </Tabs>

      {/* Sticky save bar — only visible when there are unsaved changes */}
      {isDirty && (
        <div
          role="region"
          aria-label={t('saveAllSettingsLabel')}
          className="fixed inset-x-0 bottom-[72px] md:bottom-0 z-40 border-t border-outline-variant bg-surface-container/95 backdrop-blur shadow-elev2"
        >
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-body-sm text-muted-foreground">You have unsaved changes.</p>
            <div className="flex gap-2">
              <Button
                variant="text"
                onClick={() => setValues(initialValues)}
                disabled={saving}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="filled"
                onClick={handleSave}
                disabled={saving}
                aria-label={t('saveAllSettingsLabel')}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? t('save') : t('saveAllSettings')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
