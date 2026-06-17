import { useMemo } from 'react'
import { PixelArtboard, PixelRects } from './PixelArtboard'
import {
  SceneBackground,
  drawBuildingShadow,
  drawLevelBadge,
  drawSelectionRing,
  drawSlotGlow,
  drawTreeShadow,
} from './SceneBackground'
import {
  SLOT_DRAW_ANCHORS,
  SLOT_HIT_AREAS,
  SLOT_SCENE_KEYS,
  TREE_ANCHOR,
  type VillageSceneSlot,
} from './pixelTypes'
import {
  buildEmptySlotMarker,
  buildGrassAccents,
  buildPlazaAndPaths,
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

  const pixelLayers = useMemo(() => {
    const rects = [...buildPlazaAndPaths(), ...buildGrassAccents()]

    for (const sceneKey of ['north', 'west', 'east', 'south'] as const) {
      const slot = slotBySceneKey.get(sceneKey)
      if (!slot) continue
      const anchor = SLOT_DRAW_ANCHORS[sceneKey]

      if (!slot.is_built) {
        rects.push(...buildEmptySlotMarker(anchor.cx, anchor.cy, slot.is_unlocked))
      }
    }

    for (const sceneKey of ['north', 'west', 'east', 'south'] as const) {
      const slot = slotBySceneKey.get(sceneKey)
      if (!slot?.is_built) continue
      const anchor = SLOT_DRAW_ANCHORS[sceneKey]
      const sprite = resolveBuildingSprite(slot.sprite_key)
      if (sprite) {
        rects.push(...drawSpriteCentered(sprite, anchor.cx, anchor.cy - 8, anchor.size + 16))
      }
    }

    const tree = resolveVillageTreeSprite(treeStageKey)
    rects.push(
      ...drawSpriteCentered(tree, TREE_ANCHOR.cx, TREE_ANCHOR.cy - 16, TREE_ANCHOR.size + 24),
    )

    return rects
  }, [slotBySceneKey, treeStageKey])

  const selectedSceneKey = selectedSlotKey
    ? SLOT_SCENE_KEYS[selectedSlotKey]
    : null

  return (
    <div
      className={`mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-[#2d4a28] p-1 shadow-xl ring-1 ring-[#8fbc8f]/40 ${className}`}
    >
      <PixelArtboard
        ariaLabel="MotionHub 마을"
        className="rounded-xl"
        onClick={({ x, y }) => {
          const sceneKey = hitTestSlot(x, y, SLOT_HIT_AREAS)
          if (!sceneKey) return
          const slot = slotBySceneKey.get(sceneKey)
          if (slot && onSlotClick) onSlotClick(slot.slot_key)
        }}
      >
        <SceneBackground />

        {(['north', 'west', 'east', 'south'] as const).map((sceneKey) => {
          const slot = slotBySceneKey.get(sceneKey)
          if (!slot) return null
          const anchor = SLOT_DRAW_ANCHORS[sceneKey]
          const selected = selectedSceneKey === sceneKey
          return drawSlotGlow(
            anchor.cx,
            anchor.cy,
            anchor.size,
            slot.is_unlocked,
            selected,
          )
        })}

        <PixelRects rects={pixelLayers} />

        {drawTreeShadow(TREE_ANCHOR.cx, TREE_ANCHOR.cy, TREE_ANCHOR.size)}

        {(['north', 'west', 'east', 'south'] as const).map((sceneKey) => {
          const slot = slotBySceneKey.get(sceneKey)
          if (!slot?.is_built) return null
          const anchor = SLOT_DRAW_ANCHORS[sceneKey]
          return (
            <g key={`shadow-${sceneKey}`}>
              {drawBuildingShadow(anchor.cx, anchor.cy, anchor.size)}
              {drawLevelBadge(anchor.cx, anchor.cy + anchor.size * 0.28, slot.level)}
            </g>
          )
        })}

        {selectedSceneKey && drawSelectionRing(SLOT_HIT_AREAS[selectedSceneKey])}
      </PixelArtboard>
    </div>
  )
}

export function MotionHubTreeScene({
  treeStageKey,
  className = '',
}: {
  treeStageKey: string
  className?: string
}) {
  const pixelLayers = useMemo(() => {
    const tree = resolveVillageTreeSprite(treeStageKey)
    return [
      ...buildPlazaAndPaths(),
      ...buildGrassAccents(),
      ...drawSpriteCentered(tree, TREE_ANCHOR.cx, TREE_ANCHOR.cy - 20, TREE_ANCHOR.size + 48),
    ]
  }, [treeStageKey])

  return (
    <div
      className={`mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-[#2d4a28] p-1 shadow-lg ring-1 ring-[#8fbc8f]/35 ${className}`}
    >
      <PixelArtboard ariaLabel="운동나무" className="rounded-xl">
        <SceneBackground />
        {drawTreeShadow(TREE_ANCHOR.cx, TREE_ANCHOR.cy, TREE_ANCHOR.size + 20)}
        <PixelRects rects={pixelLayers} />
      </PixelArtboard>
    </div>
  )
}
