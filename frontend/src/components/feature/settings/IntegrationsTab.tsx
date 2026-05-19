import { useEffect, useState } from 'react'
import { Bell, Calendar, Cloud, Mic, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { addCalDAVAccount, deleteCalDAVAccount, fetchCalDAVAccounts } from '@/lib/api'
import type { CalDAVAccount, UserSettings } from '@/lib/types'
import { useI18n } from '@/i18n.jsx'
import { ConnectionStatus, SettingField, TestButton, type ConnectionMap } from './shared'

interface Props {
  values: UserSettings
  onChange: (key: keyof UserSettings, value: string) => void
  onTest: (integration: string) => void
  connections: ConnectionMap
}

export function IntegrationsTab({ values, onChange, onTest, connections }: Props): JSX.Element {
  return (
    <div className="space-y-6">
      <WeatherSection values={values} onChange={onChange} onTest={onTest} connections={connections} />
      <NotificationsSection values={values} onChange={onChange} onTest={onTest} connections={connections} />
      <AppleCalendarSection values={values} onChange={onChange} onTest={onTest} connections={connections} />
      <VoiceSection values={values} onChange={onChange} onTest={onTest} connections={connections} />
    </div>
  )
}

function WeatherSection({ values, onChange, onTest, connections }: Props): JSX.Element {
  const { t } = useI18n()
  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-primary-container-foreground">
              <Cloud className="w-5 h-5" />
            </span>
            <h3 className="text-title-lg text-foreground">{t('settingsGroupWeather')}</h3>
          </div>
          <TestButton integration="weather" state={connections.weather} onTest={onTest} />
        </div>
        <ConnectionStatus state={connections.weather} />
        <div className="space-y-5">
          <SettingField
            fieldKey="WEATHERAPI_API_KEY"
            label={t('settingsFieldWeatherApiKey')}
            desc={t('settingsFieldWeatherApiKeyDesc')}
            type="password"
            value={(values.WEATHERAPI_API_KEY as string) ?? ''}
            onChange={v => onChange('WEATHERAPI_API_KEY', v)}
          />
          <SettingField
            fieldKey="WEATHER_CITY"
            label={t('settingsFieldCity')}
            desc={t('settingsFieldCityDesc')}
            type="text"
            value={(values.WEATHER_CITY as string) ?? ''}
            onChange={v => onChange('WEATHER_CITY', v)}
          />
          <SettingField
            fieldKey="WEATHER_UNITS"
            label={t('settingsFieldUnits')}
            desc={t('settingsFieldUnitsDesc')}
            type="select"
            value={(values.WEATHER_UNITS as string) ?? 'metric'}
            onChange={v => onChange('WEATHER_UNITS', v)}
            options={[
              { value: 'metric', label: t('metricUnits') },
              { value: 'imperial', label: t('imperialUnits') },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function NotificationsSection({ values, onChange, onTest, connections }: Props): JSX.Element {
  const { t } = useI18n()
  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-primary-container-foreground">
              <Bell className="w-5 h-5" />
            </span>
            <h3 className="text-title-lg text-foreground">{t('settingsGroupNotifications')}</h3>
          </div>
          <TestButton integration="notifications" state={connections.notifications} onTest={onTest} />
        </div>
        <ConnectionStatus state={connections.notifications} />
        <div className="space-y-5">
          <SettingField
            fieldKey="NTFY_SERVER"
            label={t('settingsFieldNtfyServer')}
            desc={t('settingsFieldNtfyServerDesc')}
            type="text"
            value={(values.NTFY_SERVER as string) ?? ''}
            onChange={v => onChange('NTFY_SERVER', v)}
          />
          <SettingField
            fieldKey="NTFY_TOPIC"
            label={t('settingsFieldTopic')}
            desc={t('settingsFieldTopicDesc')}
            type="text"
            value={(values.NTFY_TOPIC as string) ?? ''}
            onChange={v => onChange('NTFY_TOPIC', v)}
          />
          <SettingField
            fieldKey="NTFY_TOKEN"
            label={t('settingsFieldTokenOptional')}
            desc={t('settingsFieldTokenOptionalDesc')}
            type="password"
            value={(values.NTFY_TOKEN as string) ?? ''}
            onChange={v => onChange('NTFY_TOKEN', v)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function AppleCalendarSection({ values, onChange, onTest, connections }: Props): JSX.Element {
  const { t } = useI18n()
  const [accounts, setAccounts] = useState<CalDAVAccount[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    fetchCalDAVAccounts().then(setAccounts).catch(() => setAccounts([]))
  }, [])

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!newUrl.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      await addCalDAVAccount({
        url: newUrl.trim(),
        username: newUsername.trim(),
        password: newPassword,
      })
      const updated = await fetchCalDAVAccounts()
      setAccounts(updated)
      setShowAddForm(false)
      setNewUrl('')
      setNewUsername('')
      setNewPassword('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(index: number): Promise<void> {
    setDeleting(index)
    setDeleteError(null)
    try {
      await deleteCalDAVAccount(index)
      const updated = await fetchCalDAVAccounts()
      setAccounts(updated)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-primary-container-foreground">
              <Calendar className="w-5 h-5" />
            </span>
            <h3 className="text-title-lg text-foreground">{t('settingsGroupAppleCalendar')}</h3>
          </div>
          <TestButton
            integration="apple_calendar"
            state={connections.apple_calendar}
            onTest={onTest}
          />
        </div>
        <ConnectionStatus state={connections.apple_calendar} />

        <div className="space-y-5">
          <SettingField
            fieldKey="CALDAV_URL"
            label={t('settingsFieldCaldavUrl')}
            desc={t('settingsFieldCaldavUrlDesc')}
            type="text"
            value={(values.CALDAV_URL as string) ?? ''}
            onChange={v => onChange('CALDAV_URL', v)}
          />
          <SettingField
            fieldKey="CALDAV_USERNAME"
            label={t('settingsFieldUsername')}
            desc={t('settingsFieldUsernameDesc')}
            type="text"
            value={(values.CALDAV_USERNAME as string) ?? ''}
            onChange={v => onChange('CALDAV_USERNAME', v)}
          />
          <SettingField
            fieldKey="CALDAV_PASSWORD"
            label={t('settingsFieldAppSpecificPassword')}
            desc={t('settingsFieldAppSpecificPasswordDesc')}
            type="password"
            value={(values.CALDAV_PASSWORD as string) ?? ''}
            onChange={v => onChange('CALDAV_PASSWORD', v)}
          />

          {accounts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>{t('configuredCalDAVAccounts') || 'Configured CalDAV accounts'}</Label>
                <ul className="space-y-2">
                  {accounts.map(acc => (
                    <li
                      key={acc.index}
                      className="flex items-center justify-between gap-3 rounded-xl bg-surface-container px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-body-sm text-foreground truncate">{acc.url}</p>
                          {acc.username && (
                            <p className="text-label-sm text-muted-foreground truncate">{acc.username}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(acc.index)}
                        disabled={deleting === acc.index}
                        aria-label={t('removeAccount') || 'Remove'}
                        className="text-error"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                {deleteError && (
                  <p className="text-body-sm text-error-container-foreground bg-error-container rounded-xl px-3 py-2">
                    {deleteError}
                  </p>
                )}
              </div>
            </>
          )}

          {!showAddForm ? (
            <Button
              type="button"
              variant="tonal"
              onClick={() => setShowAddForm(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('addCalDAVAccount') || 'Add CalDAV account'}
            </Button>
          ) : (
            <form onSubmit={handleAdd} className="space-y-3 rounded-2xl bg-surface-container p-4">
              <p className="text-label-lg text-foreground">{t('addCalDAVAccount') || 'Add CalDAV account'}</p>
              <Input
                type="url"
                placeholder={t('caldavUrlPlaceholder') || 'CalDAV URL, e.g. https://caldav.icloud.com'}
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                required
              />
              <Input
                type="text"
                placeholder={t('caldavUsernamePlaceholder') || 'Username (Apple ID email)'}
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
              />
              <Input
                type="password"
                placeholder={t('caldavPasswordPlaceholder') || 'App-specific password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              {addError && (
                <p className="text-body-sm text-error-container-foreground bg-error-container rounded-xl px-3 py-2">
                  {addError}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" variant="filled" disabled={adding}>
                  {adding ? t('save') : t('addAccount') || 'Add account'}
                </Button>
                <Button
                  type="button"
                  variant="text"
                  onClick={() => {
                    setShowAddForm(false)
                    setAddError(null)
                  }}
                >
                  {t('cancel') || 'Cancel'}
                </Button>
              </div>
            </form>
          )}

          <div className="rounded-2xl bg-surface-container-high p-4 text-body-sm text-muted-foreground space-y-2">
            <p className="text-label-lg text-foreground">{t('settingsLocalCalendarTitle')}</p>
            <p>{t('settingsLocalCalendarNote')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function VoiceSection({ values, onChange, onTest, connections }: Props): JSX.Element {
  const { t } = useI18n()
  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-primary-container-foreground">
              <Mic className="w-5 h-5" />
            </span>
            <h3 className="text-title-lg text-foreground">{t('settingsGroupVoiceControl')}</h3>
          </div>
          <TestButton
            integration="voice_webhook"
            state={connections.voice_webhook}
            onTest={onTest}
          />
        </div>
        <ConnectionStatus state={connections.voice_webhook} />
        <SettingField
          fieldKey="VOICE_WEBHOOK_SECRET"
          label={t('settingsFieldWebhookSecret')}
          desc={t('settingsFieldWebhookSecretDesc')}
          type="password"
          value={(values.VOICE_WEBHOOK_SECRET as string) ?? ''}
          onChange={v => onChange('VOICE_WEBHOOK_SECRET', v)}
        />
        <div className="rounded-2xl bg-surface-container-high p-4 text-body-sm text-muted-foreground space-y-2">
          <p className="text-label-lg text-foreground">{t('settingsVoiceWebhookTitle')}</p>
          <p>
            {t('settingsVoiceWebhookNote1')}{' '}
            <code className="rounded bg-surface-container px-1.5 py-0.5 text-label-sm">
              POST /api/voice/command
            </code>{' '}
            {t('settingsVoiceWebhookNote2')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
