import type { ReactNode } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
  loading?: boolean
  lastRefresh?: Date | null
  onRefresh?: () => void
  /** Extra classes for the main content wrapper (max-width, padding). */
  contentClassName?: string
}

/**
 * Application shell: TopBar (sticky), SideNav (md+), BottomNav (< md), main content.
 * Handles safe-area padding and the layout offsets needed by the navigation rails.
 */
export function AppShell({ children, loading, lastRefresh, onRefresh, contentClassName }: AppShellProps): JSX.Element {
  return (
    <div className="bg-app min-h-screen min-h-dvh flex flex-col md:pl-20">
      <TopBar loading={loading} lastRefresh={lastRefresh} onRefresh={onRefresh} />
      <SideNav />
      <main className={cn('flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-12', contentClassName)}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
