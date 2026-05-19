import { Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/i18n.jsx'
import type { UserSettings } from '@/lib/types'
import { SettingField } from './shared'

interface Props {
  values: UserSettings
  onChange: (key: keyof UserSettings, value: string) => void
}

export function GeneralTab({ values, onChange }: Props): JSX.Element {
  const { t } = useI18n()
  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-primary-container-foreground">
            <Globe className="w-5 h-5" />
          </span>
          <h3 className="text-title-lg text-foreground">{t('settingsGroupGeneral')}</h3>
        </div>
        <div className="space-y-5">
          <SettingField
            fieldKey="APP_NAME"
            label={t('settingsFieldAppName')}
            desc={t('settingsFieldAppNameDesc')}
            type="text"
            value={(values.APP_NAME as string) ?? ''}
            onChange={v => onChange('APP_NAME', v)}
          />
          <SettingField
            fieldKey="APP_TIMEZONE"
            label={t('settingsFieldAppTimezone')}
            desc={t('settingsFieldAppTimezoneDesc')}
            type="text"
            value={(values.APP_TIMEZONE as string) ?? ''}
            onChange={v => onChange('APP_TIMEZONE', v)}
          />
          <SettingField
            fieldKey="APP_LANGUAGE"
            label={t('settingsFieldAppLanguage')}
            desc={t('settingsFieldAppLanguageDesc')}
            type="select"
            value={(values.APP_LANGUAGE as string) ?? 'en'}
            onChange={v => onChange('APP_LANGUAGE', v)}
            options={[
              { value: 'en', label: t('languageEnglish') },
              { value: 'de', label: t('languageGerman') },
            ]}
          />
          <SettingField
            fieldKey="DAILY_SUMMARY_TIME"
            label={t('settingsFieldDailyBriefingTime')}
            desc={t('settingsFieldDailyBriefingTimeDesc')}
            type="time"
            value={(values.DAILY_SUMMARY_TIME as string) ?? ''}
            onChange={v => onChange('DAILY_SUMMARY_TIME', v)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
