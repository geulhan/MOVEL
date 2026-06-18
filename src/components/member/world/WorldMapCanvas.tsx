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

const BUILDING_SCALE = 1.1

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

      <g id="buildings">
        {buildingLayers.map((layer) => {
          const b = buildings.find((x) => x.key === layer.buildingKey)
          return (
            <g key={layer.key}>
              {/* 건물 받침대 */}
              {(b?.isBuilt || b?.isUnlocked) && (
                <ellipse
                  cx={layer.cx}
                  cy={layer.cy + layer.size * 0.28}
                  rx={layer.size * 0.42}
                  ry={layer.size * 0.12}
                  fill="#8d6e4a"
                  opacity={0.35}
                />
              )}
              {layer.built && (
                <ellipse
                  cx={layer.cx}
                  cy={layer.cy + layer.size * 0.22}
                  rx={layer.size * 0.32}
                  ry={layer.size * 0.09}
                  fill="#2d4a28"
                  opacity={0.3}
                />
              )}
              <PixelRects rects={layer.rects} />
              {/* 운영 중 표시 */}
              {b?.isOperating && (
                <>
                  <circle cx={layer.cx} cy={layer.cy - layer.size * 0.38} r={6} fill="#5a9e6f">
                    <animate
                      attributeName="opacity"
                      values="1;0.4;1"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </>
              )}
              {b?.isBuilt && (
                <g>
                  <rect
                    x={layer.cx - 28}
                    y={layer.cy - layer.size * 0.55}
                    width={56}
                    height={18}
                    rx={6}
                    fill="#2d3436"
                    opacity={0.88}
                  />
                  <text
                    x={layer.cx}
                    y={layer.cy - layer.size * 0.55 + 13}
                    textAnchor="middle"
                    fill="#ffeaa7"
                    fontSize={11}
                    fontWeight="bold"
                    fontFamily="system-ui,sans-serif"
                  >
                    {b.shortLabel} Lv.{b.level}
                  </text>
                </g>
              )}
              {selectedBuildingKey === layer.buildingKey && (
                <circle
                  cx={layer.cx}
                  cy={layer.cy}
                  r={layer.size * 0.45}
                  fill="none"
                  stroke="#ffca28"
                  strokeWidth={4}
                  opacity={0.9}
                />
              )}
            </g>
          )
        })}
      </g>

      {drawTreeShadow(TREE_WORLD.cx, TREE_WORLD.cy + 10, TREE_WORLD.drawSize * 0.48)}
      <g id="hero-tree">
        <PixelRects rects={treeSprite} />
      </g>

      {buildings.some((b) => b.isOperating) && (
        <g id="village-life" opacity={0.85}>
          <VillageWalker cx={420} cy={540} delay={0} />
          <VillageWalker cx={620} cy={520} delay={0.6} />
          <VillageWalker cx={380} cy={680} delay={1.2} />
        </g>
      )}
    </svg>
  )
}

function VillageWalker({ cx, cy, delay }: { cx: number; cy: number; delay: number }) {
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="translate"
        values={`0,0; 8,-3; 0,0; -8,-3; 0,0`}
        dur="4s"
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
      <circle cx={cx} cy={cy} r={5} fill="#ffcc80" stroke="#5d4037" strokeWidth={1.5} />
      <rect x={cx - 4} y={cy + 4} width={8} height={10} rx={2} fill="#ef5350" />
    </g>
  )
}
