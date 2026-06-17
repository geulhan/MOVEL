import { useMemo } from 'react'
import { PixelArtboard, PixelRects } from './PixelArtboard'
import {
  SLOT_DRAW_ANCHORS,
  SLOT_HIT_AREAS,
  SLOT_SCENE_KEYS,
  TREE_ANCHOR,
  type VillageSceneSlot,
} from './pixelTypes'
import {
  buildEmptySlotMarker,
  buildGrassBackground,
  buildPlazaAndPaths,
  buildSkyGradient,
  drawSpriteCentered,
  hitTestSlot,
} from './pixelUtils'
import { resolveBuildingSprite, resolveVillageTreeSprite } from './villageSprites'

type Props = {
  treeStageKey: string
  slots: VillageSceneSlot[]
  selectedSlotKey?: string | null
  onSlotClick?: (slotKey: string) => void
  className?: string
}

export function MotionHubVillageScene({
  treeStageKey,
  slots,
  selectedSlotKey,
  onSlotClick,
  className = '',
}: Props) {
  const slotBySceneKey = useMemo(() => {
    const map = new Map<string, VillageSceneSlot>()
    for (const slot of slots) {
      const sceneKey = SLOT_SCENE_KEYS[slot.slot_key]
      if (sceneKey) map.set(sceneKey, slot)
    }
    return map
  }, [slots])

  const layers = useMemo(() => {
    const rects = [
      ...buildSkyGradient(),
      ...buildGrassBackground(),
      ...buildPlazaAndPaths(),
    ]

    for (const sceneKey of ['north', 'west', 'east', 'south'] as const) {
      const slot = slotBySceneKey.get(sceneKey)
      if (!slot) continue
      const anchor = SLOT_DRAW_ANCHORS[sceneKey]

      if (slot.is_built) {
        const sprite = resolveBuildingSprite(slot.sprite_key)
        if (sprite) {
          rects.push(...drawSpriteCentered(sprite, anchor.cx, anchor.cy, anchor.size))
        }
        const badgeY = anchor.cy + anchor.size * 0.22
        rects.push({
          x: anchor.cx - 28,
          y: badgeY,
          width: 56,
          height: 20,
          fill: '#2d3436',
        })
      } else {
        rects.push(
          ...buildEmptySlotMarker(anchor.cx, anchor.cy, slot.is_unlocked),
        )
      }
    }

    const tree = resolveVillageTreeSprite(treeStageKey)
    rects.push(
      ...drawSpriteCentered(tree, TREE_ANCHOR.cx, TREE_ANCHOR.cy, TREE_ANCHOR.size),
    )

    return rects
  }, [slotBySceneKey, treeStageKey])

  const highlights = useMemo(() => {
    if (!selectedSlotKey) return []
    const sceneKey = SLOT_SCENE_KEYS[selectedSlotKey]
    if (!sceneKey) return []
    const area = SLOT_HIT_AREAS[sceneKey]
    return [
      {
        x: area.x,
        y: area.y,
        width: area.w,
        height: area.h,
        fill: 'rgba(255, 214, 102, 0.28)',
      },
      {
        x: area.x,
        y: area.y,
        width: area.w,
        height: 4,
        fill: '#ffd666',
      },
      {
        x: area.x,
        y: area.y + area.h - 4,
        width: area.w,
        height: 4,
        fill: '#ffd666',
      },
      {
        x: area.x,
        y: area.y,
        width: 4,
        height: area.h,
        fill: '#ffd666',
      },
      {
        x: area.x + area.w - 4,
        y: area.y,
        width: 4,
        height: area.h,
        fill: '#ffd666',
      },
    ]
  }, [selectedSlotKey])

  return (
    <div
      className={`mx-auto w-full max-w-md overflow-hidden rounded-2xl shadow-lg ring-1 ring-[#4a6f3d]/30 ${className}`}
    >
      <PixelArtboard
        ariaLabel="MotionHub 마을"
        onClick={({ x, y }) => {
          const sceneKey = hitTestSlot(x, y, SLOT_HIT_AREAS)
          if (!sceneKey) return
          const slot = slotBySceneKey.get(sceneKey)
          if (slot && onSlotClick) onSlotClick(slot.slot_key)
        }}
      >
        <PixelRects rects={layers} />
        <PixelRects rects={highlights} />
      </PixelArtboard>
    </div>
  )
}

/** 성장 탭 운동나무만 크게 표시 */
export function MotionHubTreeScene({
  treeStageKey,
  className = '',
}: {
  treeStageKey: string
  className?: string
}) {
  const rects = useMemo(() => {
    const bg = [
      ...buildSkyGradient(),
      ...buildGrassBackground(),
      ...buildPlazaAndPaths(),
    ]
    const tree = resolveVillageTreeSprite(treeStageKey)
    return [
      ...bg,
      ...drawSpriteCentered(tree, TREE_ANCHOR.cx, TREE_ANCHOR.cy, TREE_ANCHOR.size + 40),
    ]
  }, [treeStageKey])

  return (
    <div className={`mx-auto w-full max-w-sm ${className}`}>
      <PixelArtboard ariaLabel="운동나무">
        <PixelRects rects={rects} />
      </PixelArtboard>
    </div>
  )
}
