import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Conditionally join Tailwind class names, de-duplicating conflicts.
 * Used by shadcn/ui primitives and feature components.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Format an ISO timestamp as a localized time string (HH:MM).
 */
export function formatTime(iso: string | Date | null | undefined, locale = 'en'): string {
  if (!iso) return ''
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format an ISO timestamp as a localized full date.
 */
export function formatDate(
  iso: string | Date | null | undefined,
  locale = 'en',
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
): string {
  if (!iso) return ''
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale, options)
}

/**
 * Render a date relative to now using Intl.RelativeTimeFormat.
 */
export function formatRelative(iso: string | Date | null | undefined, locale = 'en'): string {
  if (!iso) return ''
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return ''
  const diff = d.getTime() - Date.now()
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const abs = Math.abs(diff)
  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (abs < hour) return rtf.format(Math.round(diff / minute), 'minute')
  if (abs < day) return rtf.format(Math.round(diff / hour), 'hour')
  if (abs < 7 * day) return rtf.format(Math.round(diff / day), 'day')
  return formatDate(d, locale, { day: 'numeric', month: 'short' })
}

/**
 * Group an array of items by the result of a key function.
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = keyFn(item)
      if (!acc[k]) acc[k] = []
      acc[k].push(item)
      return acc
    },
    {} as Record<K, T[]>,
  )
}
