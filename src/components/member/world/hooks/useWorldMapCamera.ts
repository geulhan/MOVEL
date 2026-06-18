import { useCallback, useEffect, useRef, useState } from 'react'
import { getVillageBounds } from '../data/worldEnvironment'
import { WORLD_SIZE } from '../data/worldLayout'

type Camera = {
  scale: number
  x: number
  y: number
}

const MIN_SCALE = 0.45
const MAX_SCALE = 2.4

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function useWorldMapCamera() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [camera, setCamera] = useState<Camera>({ scale: 1, x: 0, y: 0 })
  const dragRef = useRef<{
    active: boolean
    startX: number
    startY: number
    camX: number
    camY: number
  } | null>(null)
  const pinchRef = useRef<{
    dist: number
    scale: number
  } | null>(null)

  const fitToVillage = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const w = el.clientWidth
    const h = el.clientHeight
    const bounds = getVillageBounds()
    const span = Math.max(bounds.width, bounds.height) * 1.05
    const scale = clamp(Math.min(w, h) / span, MIN_SCALE, MAX_SCALE)
    const x = w / 2 - bounds.cx * scale
    const y = h / 2 - bounds.cy * scale
    setCamera({ scale, x, y })
  }, [])

  useEffect(() => {
    fitToVillage()
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(() => fitToVillage())
    ro.observe(el)
    return () => ro.disconnect()
  }, [fitToVillage])

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const el = viewportRef.current
      if (!el) return { x: 0, y: 0 }
      const rect = el.getBoundingClientRect()
      const sx = clientX - rect.left
      const sy = clientY - rect.top
      return {
        x: (sx - camera.x) / camera.scale,
        y: (sy - camera.y) / camera.scale,
      }
    },
    [camera.scale, camera.x, camera.y],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch' && e.isPrimary === false) return
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        camX: camera.x,
        camY: camera.y,
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [camera.x, camera.y],
  )

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag?.active) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    setCamera((c) => ({ ...c, x: drag.camX + dx, y: drag.camY + dy }))
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY > 0 ? 0.92 : 1.08

    setCamera((c) => {
      const nextScale = clamp(c.scale * factor, MIN_SCALE, MAX_SCALE)
      const wx = (mx - c.x) / c.scale
      const wy = (my - c.y) / c.scale
      return {
        scale: nextScale,
        x: mx - wx * nextScale,
        y: my - wy * nextScale,
      }
    })
  }, [])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 2) return
      const [a, b] = [e.touches[0], e.touches[1]]
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      pinchRef.current = { dist, scale: camera.scale }
    },
    [camera.scale],
  )

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const pinch = pinchRef.current
    if (!pinch || e.touches.length !== 2) return
    const [a, b] = [e.touches[0], e.touches[1]]
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const ratio = dist / pinch.dist
    setCamera((c) => ({
      ...c,
      scale: clamp(pinch.scale * ratio, MIN_SCALE, MAX_SCALE),
    }))
  }, [])

  const onTouchEnd = useCallback(() => {
    pinchRef.current = null
  }, [])

  return {
    viewportRef,
    camera,
    fitToVillage,
    screenToWorld,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onWheel,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    worldSize: WORLD_SIZE,
  }
}
