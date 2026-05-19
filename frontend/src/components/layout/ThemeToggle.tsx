import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import type { Theme } from '@/providers/theme-context'
import { cn } from '@/lib/utils'

/**
 * Three-state theme toggle: cycles Light → Dark → System.
 * Visually compact, fits in the top bar next to the refresh button.
 */
export function ThemeToggle({ className }: { className?: string }): JSX.Element {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const next: Record<Theme, Theme> = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  }

  const label: Record<Theme, string> = {
    light: 'Switch to dark theme',
    dark: 'Switch to system theme',
    system: 'Switch to light theme',
  }

  const Icon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun

  return (
    <button
      type="button"
      onClick={() => setTheme(next[theme])}
      aria-label={label[theme]}
      title={label[theme]}
      className={cn(
        'state-layer relative inline-flex items-center justify-center w-10 h-10 rounded-full text-foreground hover:bg-surface-container transition-colors duration-short3',
        className,
      )}
    >
      <Icon className="w-5 h-5 transition-transform duration-medium2" />
    </button>
  )
}
