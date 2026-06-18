import { useMemo } from 'react'
import { PixelRects } from '../pixel/PixelArtboard'
import { drawTreeShadow } from '../pixel/SceneBackground'
import { ARTBOARD_SIZE } from '../pixel/pixelTypes'
import {
  buildCompleteWorldTerrain,
  buildConstructionSite,
  buildLockedMist,
} from './data/worldMapGenerator'
import { generateWorldEnvironment } from './data/worldEnvironment'
import {
  resolveTreeAsset,
  VILLAGE_BUILDING_EXTERIOR,
} from './data/villageAssets'
import { TREE_WORLD } from './data/worldLayout'
import type { WorldBuildingState } from './hooks/useVillageWorldState'
import type { WorldBuildingKey } from './data/worldLayout'
import { VillageEnvironmentLayer } from './VillageEnvironmentLayer'
import { VillageNpcLayer } from './VillageNpcLayer'
import { VillageFloatingRewards } from './VillageFloatingRewards'

type Props = {
  treeStageKey: string
  buildings: WorldBuildingState[]
  selectedBuildingKey: string | null
  isWorldActive?: boolean
  exerciseEventsSinceCollect?: number
}

const BUILDING_SCALE = 1.725

type BuildingLayer = {
  key: string
  cx: number
  cy: number
  size: number
  built: boolean
  buildingKey: WorldBuildingKey
  imageUrl?: string
  pixelRects?: ReturnType<typeof buildLockedMist>
  imageOpacity?: number
}

export function WorldMapCanvas({
  treeStageKey,
  buildings,
  selectedBuildingKey,
  isWorldActive = false,
  exerciseEventsSinceCollect = 0,
}: Props) {
  const terrain = useMemo(
    () => buildCompleteWorldTerrain(treeStageKey),
    [treeStageKey],
  )

  const envProps = useMemo(() => generateWorldEnvironment(), [])

  const buildingLayers = useMemo((): BuildingLayer[] => {
    const layers: BuildingLayer[] = []

    for (const b of buildings) {
      const size = Math.round(b.drawSize * BUILDING_SCALE)

      if (!b.isUnlocked) {
        layers.push({
          key: `${b.key}-locked`,
          pixelRects: buildLockedMist(b.cx, b.cy),
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
          pixelRects: buildConstructionSite(b.cx, b.cy),
          imageUrl: VILLAGE_BUILDING_EXTERIOR[b.key],
          imageOpacity: 0.45,
          cx: b.cx,
          cy: b.cy,
          size,
          built: false,
          buildingKey: b.key,
        })
        continue
      }

      layers.push({
        key: b.key,
        imageUrl: VILLAGE_BUILDING_EXTERIOR[b.key],
        cx: b.cx,
        cy: b.cy,
        size,
        built: true,
        buildingKey: b.key,
      })
    }
    return layers
  }, [buildings])

  const treeAsset = resolveTreeAsset(treeStageKey)
  const treeSize = TREE_WORLD.drawSize
  const showRewards = isWorldActive && exerciseEventsSinceCollect > 0

  return (
    <svg
      width={ARTBOARD_SIZE}
      height={ARTBOARD_SIZE}
      viewBox={`0 0 ${ARTBOARD_SIZE} ${ARTBOARD_SIZE}`}
      className="block touch-none"
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

      <g id="terrain-grass" style={{ imageRendering: 'pixelated' }}>
        <PixelRects rects={terrain.grass} />
      </g>
      <g id="terrain-elevation" opacity={0.9} style={{ imageRendering: 'pixelated' }}>
        <PixelRects rects={terrain.elevation} />
      </g>
      <g id="terrain-forest" style={{ imageRendering: 'pixelated' }}>
        <PixelRects rects={terrain.forest} />
      </g>
      <g id="terrain-paths" style={{ imageRendering: 'pixelated' }}>
        <PixelRects rects={terrain.paths} />
      </g>
      <g id="terrain-plaza" style={{ imageRendering: 'pixelated' }}>
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

      <VillageEnvironmentLayer props={envProps} />

      <g id="terrain-rocks" style={{ imageRendering: 'pixelated' }} opacity={0.7}>
        <PixelRects rects={terrain.rocks} />
      </g>
      <g id="terrain-trees" style={{ imageRendering: 'pixelated' }} opacity={0.65}>
        <PixelRects rects={terrain.smallTrees} />
      </g>

      <g id="buildings">
        {buildingLayers.map((layer) => {
          const b = buildings.find((x) => x.key === layer.buildingKey)
          const imgW = layer.size * 1.35
          const imgH = layer.size * 1.35
          const imgX = layer.cx - imgW / 2
          const imgY = layer.cy - imgH * 0.82

          return (
            <g key={layer.key}>
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
              {layer.imageUrl && (
                <image
                  href={layer.imageUrl}
                  x={imgX}
                  y={imgY}
                  width={imgW}
                  height={imgH}
                  opacity={layer.imageOpacity ?? 1}
                  preserveAspectRatio="xMidYMax meet"
                />
              )}
              {layer.pixelRects && (
                <g style={{ imageRendering: 'pixelated' }}>
                  <PixelRects rects={layer.pixelRects} />
                </g>
              )}
              {b?.isOperating && (
                <circle cx={layer.cx} cy={layer.cy - layer.size * 0.38} r={5} fill="#5a9e6f" opacity={0.7}>
                  <animate
                    attributeName="opacity"
                    values="0.7;0.3;0.7"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
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

      {drawTreeShadow(TREE_WORLD.cx, TREE_WORLD.cy + 10, treeSize * 0.48)}
      <g id="hero-tree">
        <image
          href={treeAsset}
          x={TREE_WORLD.cx - treeSize / 2}
          y={TREE_WORLD.cy - treeSize * 0.72}
          width={treeSize}
          height={treeSize}
          preserveAspectRatio="xMidYMax meet"
        />
      </g>

      <VillageNpcLayer />

      <VillageFloatingRewards active={showRewards} />

      {isWorldActive && (
        <g id="village-active-glow" pointerEvents="none">
          <circle cx={TREE_WORLD.cx} cy={TREE_WORLD.cy} r={treeSize * 0.55} fill="none" stroke="#5a9e6f" strokeWidth={2} opacity={0.25}>
            <animate attributeName="r" values={`${treeSize * 0.5};${treeSize * 0.62};${treeSize * 0.5}`} dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.15;0.35;0.15" dur="3s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  )
}
