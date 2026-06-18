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
  VILLAGE_BUILDING_EXTERIOR,
} from './data/villageAssets'
import { TREE_WORLD, WORLD_BUILDINGS } from './data/worldLayout'
import type { WorldBuildingState } from './hooks/useVillageWorldState'
import type { WorldBuildingKey } from './data/worldLayout'
import { VillageEnvironmentLayer } from './VillageEnvironmentLayer'
import { VillageNpcLayer } from './VillageNpcLayer'
import { VillageFloatingRewards } from './VillageFloatingRewards'
import { BuildingPlotGraphic } from './WorldBuildingPlotLayer'
import { WorldBuildingExteriorGraphic } from './WorldBuildingExteriorGraphic'
import { WorldKingdomTreeGraphic } from './WorldKingdomTreeGraphic'

type Props = {
  treeStageKey: string
  buildings: WorldBuildingState[]
  selectedBuildingKey: string | null
  isWorldActive?: boolean
  exerciseEventsSinceCollect?: number
}

/** 건물 스케일 — 기존 대비 약 25% 축소 */
const BUILDING_SCALE = 1.94

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
          imageOpacity: 0.5,
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

  const treeSize = TREE_WORLD.drawSize
  const showRewards = isWorldActive && exerciseEventsSinceCollect > 0

  return (
    <svg
      width={ARTBOARD_SIZE}
      height={ARTBOARD_SIZE}
      viewBox={`0 0 ${ARTBOARD_SIZE} ${ARTBOARD_SIZE}`}
      className="block touch-none"
      aria-label="운동 왕국 월드맵"
    >
      <defs>
        <linearGradient id="wm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#87ceeb" />
          <stop offset="45%" stopColor="#b8dff0" />
          <stop offset="100%" stopColor="#8ecf7a" />
        </linearGradient>
        <radialGradient id="kingdom-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff9e6" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#8ecf7a" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="meadow-bright" cx="50%" cy="52%" r="48%">
          <stop offset="0%" stopColor="#e8ffb8" stopOpacity={0.42} />
          <stop offset="50%" stopColor="#b8f090" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#6aab58" stopOpacity={0} />
        </radialGradient>
        <filter
          id="wm-building-shadow"
          x="-35%"
          y="-25%"
          width="170%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0f2010" floodOpacity="0.5" />
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.28" />
        </filter>
        <filter
          id="wm-tree-shadow"
          x="-40%"
          y="-30%"
          width="180%"
          height="170%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#142810" floodOpacity="0.45" />
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.22" />
        </filter>
      </defs>

      <rect width={ARTBOARD_SIZE} height={320} fill="url(#wm-sky)" />
      <ellipse cx="220" cy="110" rx="100" ry="38" fill="#ffffff" opacity={0.45} />
      <ellipse cx="780" cy="90" rx="90" ry="34" fill="#ffffff" opacity={0.4} />

      <g id="terrain-grass" style={{ imageRendering: 'pixelated' }}>
        <PixelRects rects={terrain.grass} />
      </g>
      <g id="terrain-elevation" opacity={0.85} style={{ imageRendering: 'pixelated' }}>
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

      <ellipse
        cx={TREE_WORLD.cx}
        cy={TREE_WORLD.cy + 24}
        rx={228}
        ry={182}
        fill="url(#meadow-bright)"
      />

      <ellipse
        cx={TREE_WORLD.cx}
        cy={TREE_WORLD.cy + 8}
        rx={185}
        ry={148}
        fill="url(#kingdom-glow)"
      />

      <VillageEnvironmentLayer props={envProps} />

      <g id="terrain-rocks" style={{ imageRendering: 'pixelated' }} opacity={0.5}>
        <PixelRects rects={terrain.rocks} />
      </g>
      <g id="terrain-trees" style={{ imageRendering: 'pixelated' }} opacity={0.45}>
        <PixelRects rects={terrain.smallTrees} />
      </g>

      <g id="building-plots">
        {WORLD_BUILDINGS.map((def) => {
          const state = buildings.find((b) => b.key === def.key)
          return (
            <BuildingPlotGraphic
              key={`plot-${def.key}`}
              building={def}
              isBuilt={state?.isBuilt ?? false}
              isUnlocked={state?.isUnlocked ?? false}
            />
          )
        })}
      </g>

      <g id="buildings">
        {buildingLayers.map((layer) => {
          const b = buildings.find((x) => x.key === layer.buildingKey)
          const def = WORLD_BUILDINGS.find((d) => d.key === layer.buildingKey)
          const plotRy = def?.plotRy ?? 78
          const imgW = layer.size * 1.22
          const imgH = layer.size * 1.22
          const imgX = layer.cx - imgW / 2
          const groundY = layer.cy + 14
          const imgY = groundY - imgH + plotRy * 0.35

          return (
            <g key={layer.key}>
              {layer.imageUrl && (
                <WorldBuildingExteriorGraphic
                  imageUrl={layer.imageUrl}
                  cx={layer.cx}
                  groundY={groundY}
                  imgX={imgX}
                  imgY={imgY}
                  imgW={imgW}
                  imgH={imgH}
                  plotRx={def?.plotRx ?? 100}
                  plotRy={def?.plotRy ?? 75}
                  opacity={layer.imageOpacity ?? 1}
                />
              )}
              {layer.pixelRects && (
                <g style={{ imageRendering: 'pixelated' }}>
                  <PixelRects rects={layer.pixelRects} />
                </g>
              )}
              {b?.isOperating && (
                <circle cx={layer.cx} cy={imgY + 8} r={5} fill="#5a9e6f" opacity={0.65}>
                  <animate
                    attributeName="opacity"
                    values="0.65;0.25;0.65"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {b?.isBuilt && (
                <g>
                  <rect
                    x={layer.cx - 30}
                    y={imgY - 22}
                    width={60}
                    height={20}
                    rx={6}
                    fill="#2d3436"
                    opacity={0.9}
                  />
                  <text
                    x={layer.cx}
                    y={imgY - 8}
                    textAnchor="middle"
                    fill="#ffeaa7"
                    fontSize={12}
                    fontWeight="bold"
                    fontFamily="system-ui,sans-serif"
                  >
                    {b.shortLabel} Lv.{b.level}
                  </text>
                </g>
              )}
              {selectedBuildingKey === layer.buildingKey && (
                <ellipse
                  cx={layer.cx}
                  cy={groundY}
                  rx={(def?.plotRx ?? 100) + 8}
                  ry={(def?.plotRy ?? 75) + 6}
                  fill="none"
                  stroke="#ffca28"
                  strokeWidth={4}
                  opacity={0.95}
                />
              )}
            </g>
          )
        })}
      </g>

      {drawTreeShadow(TREE_WORLD.cx, TREE_WORLD.cy + 10, treeSize * 0.52)}
      <g id="hero-tree">
        <WorldKingdomTreeGraphic
          cx={TREE_WORLD.cx}
          cy={TREE_WORLD.cy}
          size={treeSize}
          stageKey={treeStageKey}
        />
      </g>

      <VillageNpcLayer />

      <VillageFloatingRewards active={showRewards} />

      {isWorldActive && (
        <g id="village-active-glow" pointerEvents="none">
          <circle
            cx={TREE_WORLD.cx}
            cy={TREE_WORLD.cy}
            r={treeSize * 0.55}
            fill="none"
            stroke="#5a9e6f"
            strokeWidth={2}
            opacity={0.25}
          >
            <animate
              attributeName="r"
              values={`${treeSize * 0.5};${treeSize * 0.65};${treeSize * 0.5}`}
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.15;0.35;0.15"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}
    </svg>
  )
}
