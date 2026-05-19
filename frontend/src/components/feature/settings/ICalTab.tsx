import { useEffect, useState } from 'react'
import { Calendar, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { addICalUrl, deleteICalUrl, fetchICalUrls, patchICalFeed } from '@/lib/api'
import type { ICalFeed, UserSettings } from '@/lib/types'
import { useI18n } from '@/i18n.jsx'
import { ConnectionStatus, TestButton, type ConnectionMap } from './shared'

interface Props {
  onChange: (key: keyof UserSettings, value: string) => void
  onTest: (integration: string) => void
  connections: ConnectionMap
}

export function ICalTab({ onChange, onTest, connections }: Props): JSX.Element {
  const { t } = useI18n()
  const [urls, setUrls] = useState<ICalFeed[]>([])
  const [newUrl, setNewUrl] = useState('')
  const [newFeedIsBirthday, setNewFeedIsBirthday] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    fetchICalUrls().then(setUrls).catch(() => setUrls([]))
  }, [])

  function syncIcalSettings(updatedFeeds: ICalFeed[]): void {
    onChange(
      'ICAL_FEEDS',
      JSON.stringify(updatedFeeds.map(({ url, is_birthday }) => ({ url, is_birthday }))),
    )
    onChange('ICAL_URLS', updatedFeeds.map(u => u.url).join(','))
  }

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!newUrl.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      await addICalUrl(newUrl.trim(), newFeedIsBirthday)
      const updated = await fetchICalUrls()
      setUrls(updated)
      syncIcalSettings(updated)
      setNewUrl('')
      setNewFeedIsBirthday(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(index: number): Promise<void> {
    setDeleting(index)
    try {
      await deleteICalUrl(index)
      const updated = await fetchICalUrls()
      setUrls(updated)
      syncIcalSettings(updated)
    } catch {
      // ignore
    } finally {
      setDeleting(null)
    }
  }

  async function handleToggleBirthday(entry: ICalFeed): Promise<void> {
    setToggling(entry.index)
    setToggleError(null)
    try {
      await patchICalFeed(entry.index, { is_birthday: !entry.is_birthday })
      const updated = await fetchICalUrls()
      setUrls(updated)
      syncIcalSettings(updated)
    } catch {
      setToggleError(t('iCalFeedToggleError'))
    } finally {
      setToggling(null)
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
            <h3 className="text-title-lg text-foreground">{t('settingsGroupICalCalendar')}</h3>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="text"
              size="sm"
              onClick={() => setShowGuide(v => !v)}
              aria-expanded={showGuide}
              className="gap-1"
            >
              {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showGuide ? t('hideSetupGuide') : t('showSetupGuide')}
            </Button>
            <TestButton
              integration="ical_calendar"
              state={connections.ical_calendar}
              onTest={onTest}
            />
          </div>
        </div>
        <ConnectionStatus state={connections.ical_calendar} />

        {showGuide && (
          <div
            role="region"
            aria-label={t('showSetupGuide')}
            className="rounded-2xl bg-surface-container-high p-4 space-y-3 text-body-sm text-muted-foreground"
          >
            <p>{t('icalGuideIntro')}</p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>
                <strong className="text-foreground">{t('icalGuideStep1Title')}</strong>
                <p className="mt-1 ml-5">{t('icalGuideStep1Text')}</p>
              </li>
              <li>
                <strong className="text-foreground">{t('icalGuideStep2Title')}</strong>
                <p className="mt-1 ml-5">{t('icalGuideStep2Text')}</p>
              </li>
              <li>
                <strong className="text-foreground">{t('icalGuideStep3Title')}</strong>
                <p className="mt-1 ml-5">{t('icalGuideStep3Text')}</p>
              </li>
            </ol>
          </div>
        )}

        {urls.length > 0 && (
          <div className="space-y-2">
            <Label>{t('configuredICalFeeds')}</Label>
            <ul className="space-y-2">
              {urls.map(entry => (
                <li
                  key={entry.index}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-container px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span
                      className="text-body-sm text-foreground truncate"
                      title={entry.url}
                    >
                      {entry.url.length > 60 ? `${entry.url.slice(0, 57)}…` : entry.url}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label
                      className="inline-flex items-center gap-2 text-label-sm text-muted-foreground"
                      title={t('iCalFeedIsBirthdayTitle')}
                    >
                      <Switch
                        checked={entry.is_birthday ?? false}
                        disabled={toggling === entry.index}
                        onCheckedChange={() => handleToggleBirthday(entry)}
                        aria-label={t('iCalFeedIsBirthdayToggle')}
                      />
                      <span>{t('iCalFeedIsBirthdayLabel')}</span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(entry.index)}
                      disabled={deleting === entry.index}
                      aria-label={t('removeAccount')}
                      className="text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-body-sm text-muted-foreground">{t('iCalFeedIsBirthdayHint')}</p>
            {toggleError && (
              <p className="text-body-sm text-error-container-foreground bg-error-container rounded-xl px-3 py-2">
                {toggleError}
              </p>
            )}
          </div>
        )}

        <Separator />

        <form className="space-y-3" onSubmit={handleAdd}>
          <div className="space-y-1.5">
            <Label htmlFor="ical-new-url">{t('addICalFeedUrl')}</Label>
            <p className="text-body-sm text-muted-foreground">{t('addICalFeedUrlDesc')}</p>
            <Input
              id="ical-new-url"
              type="url"
              placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              disabled={adding}
              required
            />
          </div>
          <label className="inline-flex items-center gap-2 text-label-md text-muted-foreground">
            <Switch
              checked={newFeedIsBirthday}
              onCheckedChange={setNewFeedIsBirthday}
              disabled={adding}
              aria-label={t('iCalFeedIsBirthdayToggle')}
            />
            <span>{t('iCalFeedIsBirthdayLabel')} {t('iCalFeedIsBirthdayToggle')}</span>
          </label>
          <div>
            <Button
              type="submit"
              variant="filled"
              disabled={adding || !newUrl.trim()}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {adding ? t('adding') : t('addFeed')}
            </Button>
          </div>
          {addError && (
            <p className="text-body-sm text-error-container-foreground bg-error-container rounded-xl px-3 py-2">
              {addError}
            </p>
          )}
        </form>

        <div className="rounded-2xl bg-surface-container-high p-4 text-body-sm text-muted-foreground space-y-2">
          <p className="text-label-lg text-foreground">{t('settingsICalCalendarTitle')}</p>
          <p>{t('settingsICalCalendarSetupNote')}</p>
          <p>{t('settingsICalCalendarMultiNote')}</p>
        </div>
      </CardContent>
    </Card>
  )
}
