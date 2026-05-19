import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Lightweight avatar component. Renders initials over a tonal background.
 * If `src` is provided, the image is shown instead (with initials as fallback).
 */
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: string // CSS color string, defaults to surface-container-highest
}

function getInitials(name: string | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

const SIZES = {
  sm: 'h-8 w-8 text-label-md',
  md: 'h-10 w-10 text-label-lg',
  lg: 'h-12 w-12 text-title-md',
  xl: 'h-16 w-16 text-title-lg',
} as const

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, name, size = 'md', color, style, ...props }, ref) => {
    const [imageFailed, setImageFailed] = React.useState(false)
    const showImage = !!src && !imageFailed
    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center overflow-hidden rounded-full select-none',
          'bg-surface-container-highest text-foreground font-medium',
          SIZES[size],
          className,
        )}
        style={color ? { backgroundColor: color, ...style } : style}
        {...props}
      >
        {showImage ? (
          <img src={src!} alt={alt ?? name ?? ''} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
        ) : (
          <span aria-hidden>{getInitials(name)}</span>
        )}
      </div>
    )
  },
)
Avatar.displayName = 'Avatar'

export { Avatar }
