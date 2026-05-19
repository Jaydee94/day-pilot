import { useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Eye, EyeOff, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/i18n.jsx'

export interface ConnectionState {
  loading: boolean
  ok: boolean | null
  message: string
}

export type ConnectionMap = Record<string, ConnectionState | null | undefined>

export interface FieldOption {
  value: string
  label: string
}

export interface SettingFieldProps {
  fieldKey: string
  label: string
  desc?: ReactNode
  type: 'text' | 'password' | 'time' | 'select'
  value: string
  onChange: (value: string) => void
  options?: FieldOption[]
}

/**
 * Generic settings input field with label, description and an optional reveal toggle.
 */
export function SettingField({
  fieldKey,
  label,
  desc,
  type,
  value,
  onChange,
  options,
}: SettingFieldProps): JSX.Element {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  const inputId = `setting-${fieldKey}`
  const isSecret = type === 'password'
  const inputType = isSecret ? (visible ? 'text' : 'password') : type

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      {desc && <p className="text-body-sm text-muted-foreground">{desc}</p>}
      {type === 'select' ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={inputId}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {(options ?? []).map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="relative">
          <Input
            id={inputId}
            type={inputType}
            value={value}
            onChange={e => onChange(e.target.value)}
            autoComplete="off"
            className={isSecret ? 'pr-12' : ''}
          />
          {isSecret && (
            <button
              type="button"
              onClick={() => setVisible(v => !v)}
              aria-label={visible ? t('hideValue') : t('showValue')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export interface ConnectionStatusProps {
  state: ConnectionState | null | undefined
}

export function ConnectionStatus({ state }: ConnectionStatusProps): JSX.Element | null {
  const { t } = useI18n()
  if (!state || !state.message) return null
  const ok = state.ok === true
  const Icon = ok ? CheckCircle2 : XCircle
  return (
    <p
      role="status"
      className={`flex items-start gap-2 rounded-xl px-3 py-2 text-body-sm ${
        ok
          ? 'bg-success-container text-success-container-foreground'
          : 'bg-error-container text-error-container-foreground'
      }`}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>
        <strong className="font-medium">{ok ? t('connected') : t('notConnected')}:</strong>{' '}
        {state.message}
      </span>
    </p>
  )
}

export interface TestButtonProps {
  integration: string
  state: ConnectionState | null | undefined
  onTest: (integration: string) => void
}

export function TestButton({ integration, state, onTest }: TestButtonProps): JSX.Element {
  const { t } = useI18n()
  return (
    <Button
      type="button"
      variant="outlined"
      size="sm"
      onClick={() => onTest(integration)}
      disabled={!!state?.loading}
      aria-label={t('testConnection')}
    >
      {state?.loading ? t('testingConnection') : t('testConnection')}
    </Button>
  )
}
