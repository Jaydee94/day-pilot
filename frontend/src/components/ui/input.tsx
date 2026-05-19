import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

/**
 * Material 3 inspired filled text field.
 * For full-bodied labelled fields, wrap with FormField in `./form.tsx`.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-12 w-full rounded-lg bg-surface-container px-4 py-2 text-body-lg text-foreground',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-short3',
        'file:border-0 file:bg-transparent file:text-body-md file:font-medium',
        className,
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
