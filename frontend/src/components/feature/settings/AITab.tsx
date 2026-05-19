import { Bot } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n.jsx'
import type { UserSettings } from '@/lib/types'
import { ConnectionStatus, SettingField, TestButton, type ConnectionMap } from './shared'

interface ProviderConfig {
  key: keyof UserSettings
  label: string
  desc: string
  link: string
}

interface Props {
  values: UserSettings
  onChange: (key: keyof UserSettings, value: string) => void
  onTest: (integration: string) => void
  connections: ConnectionMap
}

export function AITab({ values, onChange, onTest, connections }: Props): JSX.Element {
  const { t } = useI18n()
  const provider = (values.AI_PROVIDER as string) || 'openai'

  const credByProvider: Record<string, ProviderConfig> = {
    openai: {
      key: 'OPENAI_API_KEY',
      label: t('settingsAiOpenAiKeyLabel'),
      desc: t('settingsAiOpenAiKeyDesc'),
      link: 'https://platform.openai.com/api-keys',
    },
    github: {
      key: 'GITHUB_TOKEN',
      label: t('settingsAiGithubTokenLabel'),
      desc: t('settingsAiGithubTokenDesc'),
      link: 'https://github.com/settings/tokens',
    },
    groq: {
      key: 'GROQ_API_KEY',
      label: t('settingsAiGroqKeyLabel'),
      desc: t('settingsAiGroqKeyDesc'),
      link: 'https://console.groq.com',
    },
    google: {
      key: 'GOOGLE_AI_API_KEY',
      label: t('settingsAiGoogleKeyLabel'),
      desc: t('settingsAiGoogleKeyDesc'),
      link: 'https://aistudio.google.com/app/apikey',
    },
  }
  const cred = credByProvider[provider]

  const modelOptionsByProvider: Record<string, { value: string; label: string }[]> = {
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
  }
  const modelOptions = modelOptionsByProvider[provider] ?? []

  const providerOptions = [
    { value: 'openai', label: t('settingsAiProviderOpenAi') },
    { value: 'github', label: t('settingsAiProviderGithub') },
    { value: 'groq', label: t('settingsAiProviderGroq') },
    { value: 'google', label: t('settingsAiProviderGoogle') },
  ]

  const isFree = provider === 'groq' || provider === 'google'

  return (
    <Card variant="elevated">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-primary-container-foreground">
              <Bot className="w-5 h-5" />
            </span>
            <h3 className="text-title-lg text-foreground">{t('settingsAiProviderTitle')}</h3>
            {isFree && <Badge variant="success">{t('freeTier')}</Badge>}
          </div>
          <TestButton integration="ai" state={connections.ai} onTest={onTest} />
        </div>
        <ConnectionStatus state={connections.ai} />

        <div className="space-y-5">
          <SettingField
            fieldKey="AI_PROVIDER"
            label={t('settingsAiProviderLabel')}
            desc={t('settingsAiProviderDesc')}
            type="select"
            value={provider}
            onChange={v => onChange('AI_PROVIDER', v)}
            options={providerOptions}
          />

          {cred && (
            <SettingField
              fieldKey={cred.key as string}
              label={cred.label}
              desc={
                <>
                  {cred.desc} —{' '}
                  <a href={cred.link} target="_blank" rel="noreferrer" className="text-primary underline">
                    {t('getFreeKey')} ↗
                  </a>
                </>
              }
              type="password"
              value={(values[cred.key] as string) ?? ''}
              onChange={v => onChange(cred.key, v)}
            />
          )}

          <SettingField
            fieldKey="AI_MODEL"
            label={t('settingsAiModelLabel')}
            desc={t('settingsAiModelDesc')}
            type="select"
            value={(values.AI_MODEL as string) ?? ''}
            onChange={v => onChange('AI_MODEL', v)}
            options={[{ value: '', label: t('providerDefaultModel') }, ...modelOptions]}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="setting-AI_PROMPT_TEMPLATE">{t('settingsAiPromptLabel')}</Label>
              {values.AI_PROMPT_TEMPLATE && (
                <Button
                  type="button"
                  variant="text"
                  size="sm"
                  onClick={() => onChange('AI_PROMPT_TEMPLATE', '')}
                >
                  {t('settingsAiPromptReset')}
                </Button>
              )}
            </div>
            <p className="text-body-sm text-muted-foreground">{t('settingsAiPromptDesc')}</p>
            <Textarea
              id="setting-AI_PROMPT_TEMPLATE"
              value={(values.AI_PROMPT_TEMPLATE as string) ?? ''}
              onChange={e => onChange('AI_PROMPT_TEMPLATE', e.target.value)}
              placeholder={t('settingsAiPromptPlaceholder')}
              rows={8}
              spellCheck={false}
              className="font-mono text-body-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
