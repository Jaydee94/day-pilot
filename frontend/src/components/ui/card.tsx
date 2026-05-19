import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Material 3 Card variants:
 *   - elevated  → surface-container-low + shadow (default for floating cards)
 *   - filled    → surface-container, no shadow
 *   - outlined  → surface + border
 */
const cardVariants = cva('rounded-2xl text-foreground transition-shadow duration-medium2 ease-emphasized', {
  variants: {
    variant: {
      elevated: 'bg-surface-container-low shadow-elev1 hover:shadow-elev2',
      filled: 'bg-surface-container',
      outlined: 'bg-surface border border-outline-variant',
    },
    interactive: {
      true: 'cursor-pointer hover:-translate-y-0.5',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'elevated',
    interactive: false,
  },
})

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, interactive, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, interactive }), className)} {...props} />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6 pb-2', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-title-lg text-foreground', className)} {...props} />
  ),
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-body-md text-muted-foreground', className)} {...props} />
  ),
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6 pt-2', className)} {...props} />,
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-2 gap-2', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
