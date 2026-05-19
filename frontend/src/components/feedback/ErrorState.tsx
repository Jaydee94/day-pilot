import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps): JSX.Element {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center text-center gap-3 mx-auto max-w-md',
        'bg-error-container text-error-container-foreground rounded-2xl p-6',
        className,
      )}
    >
      <AlertTriangle className="w-8 h-8" />
      <p className="text-title-md">{title}</p>
      {message && <p className="text-body-md opacity-90">{message}</p>}
      {onRetry && (
        <Button variant="destructive" size="default" onClick={onRetry} className="mt-2">
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
