import { Toaster as SonnerToaster } from 'sonner'
import { useTheme } from '@/hooks/useTheme'

/**
 * Toast container. Sits at the application root, picks up theme from ThemeProvider.
 * Use the `toast` helper from `sonner` to dispatch messages.
 */
export function Toaster(): JSX.Element {
  const { resolvedTheme } = useTheme()
  return (
    <SonnerToaster
      theme={resolvedTheme}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast rounded-2xl border border-outline-variant bg-surface-container-high text-foreground shadow-elev3',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-surface-container-highest text-foreground',
        },
      }}
    />
  )
}

