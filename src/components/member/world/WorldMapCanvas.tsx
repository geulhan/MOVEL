import { useMemo } from 'react'
import { PixelRects } from '../pixel/PixelArtboard'
import { drawTreeShadow } from '../pixel/SceneBackground'
import { drawSpriteCentered } from '../pixel/pixelUtils'
import { resolveVillageTreeSprite } from '../pixel/villageSprites'
import { ARTBOARD_SIZE } from '../pixel/pixelTypes'
import {
  buildCompleteWorldTerrain,
  buildConstructionSite,
  buildLockedMist,
} from './data/worldMapGenerator'
import { resolveWorldBuildingSprite } from './data/worldSprites'
import { TREE_WORLD } from './data/worldLayout'
import type { WorldBuildingState } from './hooks/useVillageWorldState'

type Props = {
  treeStageKey: string
  buildings: WorldBuildingState[]
  selectedBuildingKey: string | null
}

const BUILDING_SCALE = 0.72

export function WorldMapCanvas({ treeStageKey, buildings, selectedBuildingKey }: Props) {
  const terrain = useMemo(
    () => buildCompleteWorldTerrain(treeStageKey),
    [treeStageKey],
  )

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
      const size = Math.round(b.drawSize * BUILDING_SCALE)

      if (!b.isUnlocked) {
        layers.push({
          key: `${b.key}-locked`,
          rects: buildLockedMist(b.cx, b.cy),
          cx: b.cx,
          cy: b.cy,
          size,
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
          size,
          built: false,
          buildingKey: b.key,
        })
        continue
      }

      const sprite = resolveWorldBuildingSprite(b.spriteKey)
      if (sprite) {
        layers.push({
          key: b.key,
          rects: drawSpriteCentered(sprite, b.cx, b.cy - 6, size),
          cx: b.cx,
          cy: b.cy,
          size,
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
      TREE_WORLD.cy - 20,
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
      aria-label="운동 마을 월드맵"
    >
      <defs>
        <linearGradient id="wm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#87ceeb" />
          <stop offset="45%" stopColor="#b8dff0" />
          <stop offset="100%" stopColor="#8ecf7a" />
        </linearGradient>
      </defs>

      <rect width={ARTBOARD_SIZE} height={320} fill="url(#wm-sky)" />
      <ellipse cx="220" cy="110" rx="100" ry="38" fill="#ffffff" opacity={0.5} />
      <ellipse cx="780" cy="90" rx="90" ry="34" fill="#ffffff" opacity={0.45} />

      <g id="terrain-grass">
        <PixelRects rects={terrain.grass} />
      </g>
      <g id="terrain-elevation" opacity={0.9}>
        <PixelRects rects={terrain.elevation} />
      </g>
      <g id="terrain-forest">
        <PixelRects rects={terrain.forest} />
      </g>
      <g id="terrain-paths">
        <PixelRects rects={terrain.paths} />
      </g>
      <g id="terrain-plaza">
        <PixelRects rects={terrain.plaza} />
      </g>
      <g id="terrain-shadows">
        {terrain.groundShadows.map((r, i) => (
          <ellipse
            key={`sh-${i}`}
            cx={r.x + r.width / 2}
            cy={r.y + r.height / 2}
            rx={r.width / 2}
            ry={r.height / 2}
            fill={r.fill}
          />
        ))}
      </g>
      <g id="terrain-rocks">
        <PixelRects rects={terrain.rocks} />
      </g>
      <g id="terrain-trees">
        <PixelRects rects={terrain.smallTrees} />
      </g>

      <g id="buildings" opacity={0.92}>
        {buildingLayers.map((layer) => (
          <g key={layer.key}>
            {layer.built && (
              <ellipse
                cx={layer.cx}
                cy={layer.cy + layer.size * 0.22}
                rx={layer.size * 0.28}
                ry={layer.size * 0.08}
                fill="#2d4a28"
                opacity={0.28}
              />
            )}
            <PixelRects rects={layer.rects} />
            {selectedBuildingKey === layer.buildingKey && (
              <circle
                cx={layer.cx}
                cy={layer.cy}
                r={layer.size * 0.38}
                fill="none"
                stroke="#ffca28"
                strokeWidth={3}
                opacity={0.85}
              />
            )}
          </g>
        ))}
      </g>

      {drawTreeShadow(TREE_WORLD.cx, TREE_WORLD.cy + 10, TREE_WORLD.drawSize * 0.48)}
      <g id="hero-tree">
        <PixelRects rects={treeSprite} />
      </g>
    </svg>
  )
}
