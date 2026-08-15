import { useCallback, useRef } from 'react'
import { WorldMapCanvas } from './WorldMapCanvas'
import { useWorldMapCamera } from './hooks/useWorldMapCamera'
import { TREE_WORLD, WORLD_BUILDINGS } from './data/worldLayout'
import type { SelectedWorldTarget } from './hooks/useVillageWorldState'
import type { WorldBuildingKey } from './data/worldLayout'

type Props = {
  treeStageKey: string
  buildings: import('./hooks/useVillageWorldState').WorldBuildingState[]
  selected: SelectedWorldTarget | null
  onSelect: (target: SelectedWorldTarget | null) => void
  isWorldActive?: boolean
  exerciseEventsSinceCollect?: number
  className?: string
}

const TAP_MOVE_THRESHOLD = 12

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

export function WorldMapViewport({
  treeStageKey,
  buildings,
  selected,
  onSelect,
  isWorldActive = false,
  exerciseEventsSinceCollect = 0,
  className = '',
}: Props) {
  const { viewportRef, camera, fitToKingdomCenter, screenToWorld, handlers } =
    useWorldMapCamera()
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const handleTap = useCallback(
    (clientX: number, clientY: number) => {
      const { x, y } = screenToWorld(clientX, clientY)

      if (dist(x, y, TREE_WORLD.cx, TREE_WORLD.cy) <= TREE_WORLD.hitRadius) {
        onSelect({ type: 'tree' })
        return
      }

      for (const b of WORLD_BUILDINGS) {
        if (dist(x, y, b.cx, b.cy) <= b.hitRadius) {
          onSelect({ type: 'building', key: b.key as WorldBuildingKey })
          return
        }
      }

      onSelect(null)
    },
    [onSelect, screenToWorld],
  )

  const selectedBuildingKey =
    selected?.type === 'building' ? selected.key : null

  return (
    <div
      ref={viewportRef}
      className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#1e3a20] to-[#142810] shadow-inner ring-2 ring-[#5a9e6f]/35 ${className}`}
      style={{ touchAction: 'none' }}
      onWheel={handlers.onWheel}
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY }
        handlers.onPointerDown(e)
      }}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={(e) => {
        handlers.onPointerUp(e)
        const start = pointerStart.current
        pointerStart.current = null
        if (!start) return
        const moved = dist(start.x, start.y, e.clientX, e.clientY)
        if (moved < TAP_MOVE_THRESHOLD) {
          handleTap(e.clientX, e.clientY)
        }
      }}
      onPointerCancel={handlers.onPointerCancel}
      onDoubleClick={() => fitToKingdomCenter()}
    >
      <div
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
        }}
      >
        <WorldMapCanvas
          treeStageKey={treeStageKey}
          buildings={buildings}
          selectedBuildingKey={selectedBuildingKey}
          isWorldActive={isWorldActive}
          exerciseEventsSinceCollect={exerciseEventsSinceCollect}
        />
      </div>

      <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/50">
        건물·나무를 눌러 보기 · 드래그로 이동
      </p>
    </div>
  )
}
