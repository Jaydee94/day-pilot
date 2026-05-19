import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 70 // px the user has to pull beyond
const MAX_PULL = 120 // visual cap

interface Options {
  enabled?: boolean
  onRefresh: () => Promise<unknown> | unknown
}

/**
 * Touch-based pull-to-refresh for mobile.
 * Only triggers when the document is already scrolled to top.
 * Returns the current pull distance (0..MAX_PULL) and a refreshing flag,
 * so consumers can render a custom indicator.
 */
export function usePullToRefresh({ enabled = true, onRefresh }: Options): {
  pullDistance: number
  refreshing: boolean
} {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pulling = useRef(false)

  useEffect(() => {
    if (!enabled) return

    function handleTouchStart(e: TouchEvent): void {
      if (window.scrollY > 0 || refreshing) return
      const touch = e.touches[0]
      if (!touch) return
      startY.current = touch.clientY
      pulling.current = true
    }

    function handleTouchMove(e: TouchEvent): void {
      if (!pulling.current || startY.current == null) return
      const touch = e.touches[0]
      if (!touch) return
      const delta = touch.clientY - startY.current
      if (delta > 0) {
        const damped = Math.min(MAX_PULL, delta * 0.5)
        setPullDistance(damped)
      } else {
        setPullDistance(0)
      }
    }

    async function handleTouchEnd(): Promise<void> {
      if (!pulling.current) return
      pulling.current = false
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
        }
      }
      setPullDistance(0)
      startY.current = null
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, onRefresh, pullDistance, refreshing])

  return { pullDistance, refreshing }
}
