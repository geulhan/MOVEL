import { useMemo } from 'react'
import { PixelRects } from '../pixel/PixelArtboard'
import { SceneBackground, drawBuildingShadow, drawTreeShadow } from '../pixel/SceneBackground'
import { drawSpriteCentered } from '../pixel/pixelUtils'
import { resolveVillageTreeSprite } from '../pixel/villageSprites'
import { ARTBOARD_SIZE } from '../pixel/pixelTypes'
import {
  buildConstructionSite,
  buildLockedMist,
  buildWorldMeadow,
  buildWorldPaths,
} from './data/worldTerrain'
import { resolveWorldBuildingSprite } from './data/worldSprites'
import { TREE_WORLD } from './data/worldLayout'
import type { WorldBuildingState } from './hooks/useVillageWorldState'

type Props = {
  treeStageKey: string
  buildings: WorldBuildingState[]
  selectedBuildingKey: string | null
}

export function WorldMapCanvas({ treeStageKey, buildings, selectedBuildingKey }: Props) {
  const meadowRects = useMemo(() => buildWorldMeadow(treeStageKey), [treeStageKey])
  const pathRects = useMemo(() => buildWorldPaths(buildings), [buildings])

  const buildingLayers = useMemo(() => {
    const layers: {
      key: string
      rects: ReturnType<typeof drawSpriteCentered>
      cx: number
      cy: number
      size: number
      built: boolean
      buildingKey: string
    }[] = []

    for (const b of buildings) {
      if (!b.isUnlocked) {
        layers.push({
          key: `${b.key}-locked`,
          rects: buildLockedMist(b.cx, b.cy),
          cx: b.cx,
          cy: b.cy,
          size: b.drawSize,
          built: false,
          buildingKey: b.key,
        })
        continue
      }

      if (!b.isBuilt) {
        layers.push({
          key: `${b.key}-site`,
          rects: buildConstructionSite(b.cx, b.cy),
          cx: b.cx,
          cy: b.cy,
          size: b.drawSize,
          built: false,
          buildingKey: b.key,
        })
        continue
      }

      const sprite = resolveWorldBuildingSprite(b.spriteKey)
      if (sprite) {
        layers.push({
          key: b.key,
          rects: drawSpriteCentered(sprite, b.cx, b.cy - 10, b.drawSize),
          cx: b.cx,
          cy: b.cy,
          size: b.drawSize,
          built: true,
          buildingKey: b.key,
        })
      }
    }
    return layers
  }, [buildings])

  const treeSprite = useMemo(() => {
    const tree = resolveVillageTreeSprite(treeStageKey)
    return drawSpriteCentered(
      tree,
      TREE_WORLD.cx,
      TREE_WORLD.cy - 24,
      TREE_WORLD.drawSize,
    )
  }, [treeStageKey])

  return (
    <svg
      width={ARTBOARD_SIZE}
      height={ARTBOARD_SIZE}
      viewBox={`0 0 ${ARTBOARD_SIZE} ${ARTBOARD_SIZE}`}
      className="block touch-none"
      style={{ imageRendering: 'pixelated' }}
      aria-hidden
    >
      <SceneBackground />
      <PixelRects rects={meadowRects} />
      <PixelRects rects={pathRects} />

      {buildingLayers.map((layer) => (
        <g key={layer.key}>
          {layer.built && drawBuildingShadow(layer.cx, layer.cy, layer.size * 0.45)}
          <PixelRects rects={layer.rects} />
          {selectedBuildingKey === layer.buildingKey && (
            <circle
              cx={layer.cx}
              cy={layer.cy}
              r={layer.size * 0.42}
              fill="none"
              stroke="#ffca28"
              strokeWidth={4}
              opacity={0.85}
            />
          )}
        </g>
      ))}

      {drawTreeShadow(TREE_WORLD.cx, TREE_WORLD.cy, TREE_WORLD.drawSize * 0.5)}
      <PixelRects rects={treeSprite} />
    </svg>
  )
}
