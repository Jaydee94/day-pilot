import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        tonal: 'bg-primary-container text-primary-container-foreground',
        secondary: 'bg-secondary-container text-secondary-container-foreground',
        tertiary: 'bg-tertiary-container text-tertiary-container-foreground',
        success: 'bg-success-container text-success-container-foreground',
        warning: 'bg-warning-container text-warning-container-foreground',
        error: 'bg-error-container text-error-container-foreground',
        outline: 'border border-outline text-foreground',
      },
    },
    defaultVariants: {
      variant: 'tonal',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
