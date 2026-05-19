import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Animated content placeholder. Use during initial loads instead of spinners.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('skeleton', className)} {...props} />
}

export { Skeleton }
