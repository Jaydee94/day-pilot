import { cn } from '@/lib/utils'

/**
 * Material 3 inspired circular progress indicator.
 * Use sparingly — prefer Skeleton for content placeholders.
 */
export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }): JSX.Element {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  } as const
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block rounded-full border-outline-variant border-t-primary animate-spin',
        sizes[size],
        className,
      )}
    />
  )
}
