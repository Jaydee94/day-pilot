import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/**
 * Polite empty-state with optional icon, description and a single action.
 * Use whenever a list / feed has no items yet.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps): JSX.Element {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6 gap-3', className)}>
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <div className="space-y-1 max-w-md">
        <p className="text-title-md text-foreground">{title}</p>
        {description && <p className="text-body-md text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
