import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  onRefresh: () => Promise<void>
  disabled?: boolean
}

const THRESHOLD = 64
const MAX_PULL = 96

export function PullToRefresh({ children, onRefresh, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)

  pullRef.current = pull
  refreshingRef.current = refreshing
  onRefreshRef.current = onRefresh

  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return

    function canPull() {
      return !refreshingRef.current && window.scrollY <= 0
    }

    function handleTouchStart(e: TouchEvent) {
      if (!canPull()) return
      startY.current = e.touches[0].clientY
      pulling.current = true
    }

    function handleTouchMove(e: TouchEvent) {
      if (!pulling.current) return
      if (!canPull()) {
        pulling.current = false
        setPull(0)
        return
      }
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0) {
        e.preventDefault()
        setPull(Math.min(dy * 0.5, MAX_PULL))
      } else {
        pulling.current = false
        setPull(0)
      }
    }

    async function handleTouchEnd() {
      if (!pulling.current) return
      pulling.current = false
      const currentPull = pullRef.current
      if (currentPull >= THRESHOLD) {
        setRefreshing(true)
        setPull(THRESHOLD)
        try {
          await onRefreshRef.current()
        } finally {
          setRefreshing(false)
          setPull(0)
        }
      } else {
        setPull(0)
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [disabled])

  const offset = refreshing ? THRESHOLD : pull

  return (
    <div ref={containerRef} className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{
          height: offset,
          opacity: offset > 0 ? 1 : 0,
          transition: pulling.current ? 'none' : 'opacity 0.2s',
        }}
      >
        <div className="flex items-end pb-2">
          <span className="rounded-full border border-gold/30 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal shadow-sm">
            {refreshing
              ? '새로고침 중…'
              : pull >= THRESHOLD
                ? '놓으면 새로고침'
                : '아래로 당겨 새로고침'}
          </span>
        </div>
      </div>
      <div
        style={{
          transform: offset > 0 ? `translateY(${offset}px)` : undefined,
          transition: pulling.current ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
