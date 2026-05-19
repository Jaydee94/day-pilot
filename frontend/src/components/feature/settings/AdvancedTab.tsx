import { Settings2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/i18n.jsx'
import type { UserSettings } from '@/lib/types'
import { SettingField } from './shared'

interface Props {
  values: UserSettings
  onChange: (key: keyof UserSettings, value: string) => void
}

export function AdvancedTab({ values, onChange }: Props): JSX.Element {
  const { t } = useI18n()
  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-primary-container-foreground">
            <Settings2 className="w-5 h-5" />
          </span>
          <h3 className="text-title-lg text-foreground">Advanced</h3>
        </div>
        <div className="space-y-5">
          <SettingField
            fieldKey="BIRTHDAY_CALENDAR_NAMES"
            label={t('settingsFieldBirthdayCalendarNames')}
            desc={t('settingsFieldBirthdayCalendarNamesDesc')}
            type="text"
            value={(values.BIRTHDAY_CALENDAR_NAMES as string) ?? ''}
            onChange={v => onChange('BIRTHDAY_CALENDAR_NAMES', v)}
          />
          <SettingField
            fieldKey="CALDAV_CONFIGS"
            label={t('settingsCaldavConfigsLabel')}
            desc={t('settingsCaldavConfigsDesc')}
            type="text"
            value={(values.CALDAV_CONFIGS as string) ?? ''}
            onChange={v => onChange('CALDAV_CONFIGS', v)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
