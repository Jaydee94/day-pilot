import { RefreshCw } from 'lucide-react'
import { useI18n } from '@/i18n.jsx'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'

interface TopBarProps {
  loading?: boolean
  lastRefresh?: Date | null
  onRefresh?: () => void
  className?: string
}

/**
 * Sticky application top-bar. Material 3 small top app bar style.
 * Includes brand, last-refresh time, theme toggle and a refresh action.
 */
export function TopBar({ loading = false, lastRefresh, onRefresh, className }: TopBarProps): JSX.Element {
  const { t, locale } = useI18n()

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-surface-container-low/85 backdrop-blur-md border-b border-outline-variant',
        'pt-safe',
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/favicon.svg" alt="" className="w-8 h-8 flex-shrink-0" />
          <div className="leading-tight min-w-0">
            <h1 className="text-title-lg text-foreground truncate">DayPilot</h1>
            <p className="text-label-sm text-muted-foreground -mt-0.5 truncate">{t('appTagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {lastRefresh && (
            <span className="hidden sm:inline text-label-md text-muted-foreground mr-2">
              {t('updatedAt', {
                time: lastRefresh.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
              })}
            </span>
          )}
          <ThemeToggle />
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              title={t('refresh')}
              aria-label={t('refresh')}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
