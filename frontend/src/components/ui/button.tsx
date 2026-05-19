import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Material 3 Button variants:
 *   - filled      → primary CTA, high emphasis (default)
 *   - tonal       → medium emphasis, container surface
 *   - elevated    → light surface with elevation
 *   - outlined    → low emphasis with border
 *   - text        → lowest emphasis, no background
 *   - destructive → error CTA
 *   - ghost       → text-like with hover surface (used in toolbars)
 *
 * Sizes follow M3 standards: 40px height for default (small touch target),
 * 32px sm (chips), 48px lg (forms / FAB-adjacent).
 */
export const buttonVariants = cva(
  'state-layer inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[0.1px] transition-colors duration-short3 ease-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        filled: 'bg-primary text-primary-foreground shadow-elev1 hover:shadow-elev2 active:shadow-elev1',
        tonal: 'bg-secondary-container text-secondary-container-foreground',
        elevated: 'bg-surface-container-low text-primary shadow-elev1 hover:shadow-elev2',
        outlined: 'border border-outline text-primary bg-transparent',
        text: 'text-primary bg-transparent',
        destructive: 'bg-error text-error-foreground shadow-elev1 hover:shadow-elev2',
        ghost: 'text-foreground hover:bg-surface-container',
        fab: 'bg-primary-container text-primary-container-foreground shadow-elev3 hover:shadow-elev4 rounded-2xl',
      },
      size: {
        default: 'h-10 px-6 rounded-full text-label-lg',
        sm: 'h-8 px-4 rounded-full text-label-md',
        lg: 'h-12 px-8 rounded-full text-label-lg',
        icon: 'h-10 w-10 rounded-full',
        'icon-sm': 'h-8 w-8 rounded-full',
        fab: 'h-14 w-14 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'filled',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button }
