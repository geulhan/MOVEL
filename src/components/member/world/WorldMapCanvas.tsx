import { useMemo } from 'react'
import { PixelRects } from '../pixel/PixelArtboard'
import { ARTBOARD_SIZE } from '../pixel/pixelTypes'
import {
  buildCompleteWorldTerrain,
  buildConstructionSite,
  buildLockedMist,
} from './data/worldMapGenerator'
import { generateWorldEnvironment } from './data/worldEnvironment'
import { VILLAGE_BUILDING_EXTERIOR } from './data/villageAssets'
import { TREE_WORLD, WORLD_BUILDINGS } from './data/worldLayout'
import type { WorldBuildingState } from './hooks/useVillageWorldState'
import type { WorldBuildingKey } from './data/worldLayout'
import { VillageEnvironmentLayer } from './VillageEnvironmentLayer'
import { VillageNpcLayer } from './VillageNpcLayer'
import { VillageFloatingRewards } from './VillageFloatingRewards'
import { BuildingPlotGraphic } from './WorldBuildingPlotLayer'
import { WorldBuildingExteriorGraphic } from './WorldBuildingExteriorGraphic'
import { WorldKingdomTreeGraphic } from './WorldKingdomTreeGraphic'
import { WorldCentralPlazaGraphic } from './WorldCentralPlazaGraphic'

type Props = {
  treeStageKey: string
  buildings: WorldBuildingState[]
  selectedBuildingKey: string | null
  isWorldActive?: boolean
  exerciseEventsSinceCollect?: number
}

/** 시설 30~40% 축소 — 운동나무가 항상 더 크게 */
const BUILDING_SCALE = 1.22

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
      const def = WORLD_BUILDINGS.find((d) => d.key === b.key)
      if (def?.terrainOnly) continue

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

  const treeSize = TREE_WORLD.drawSize
  const showRewards = isWorldActive && exerciseEventsSinceCollect > 0

  return (
    <svg
      width={ARTBOARD_SIZE}
      height={ARTBOARD_SIZE}
      viewBox={`0 0 ${ARTBOARD_SIZE} ${ARTBOARD_SIZE}`}
      className="block touch-none"
      aria-label="내 운동 세계"
    >
      <defs>
        <linearGradient id="wm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#87ceeb" />
          <stop offset="45%" stopColor="#b8dff0" />
          <stop offset="100%" stopColor="#8ecf7a" />
        </linearGradient>
        <radialGradient id="kingdom-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffde8" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#a8e88a" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="meadow-bright" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8ffb8" stopOpacity={0.5} />
          <stop offset="45%" stopColor="#b8f090" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#6aab58" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="tree-growth-aura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9AEA72" stopOpacity={0.35} />
          <stop offset="70%" stopColor="#62C44E" stopOpacity={0.1} />
          <stop offset="100%" stopColor="#3E9638" stopOpacity={0} />
        </radialGradient>
        <filter
          id="wm-building-shadow"
          x="-35%"
          y="-25%"
          width="170%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0f2010" floodOpacity="0.45" />
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.22" />
        </filter>
        <filter
          id="wm-tree-shadow"
          x="-40%"
          y="-30%"
          width="180%"
          height="170%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#142810" floodOpacity="0.5" />
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      <rect width={ARTBOARD_SIZE} height={300} fill="url(#wm-sky)" />
      <ellipse cx="220" cy="100" rx={100} ry={36} fill="#ffffff" opacity={0.4} />
      <ellipse cx={780} cy={85} rx={90} ry={32} fill="#ffffff" opacity={0.35} />

      <g id="terrain-grass" style={{ imageRendering: 'pixelated' }}>
        <PixelRects rects={terrain.grass} />
      </g>
      <g id="terrain-elevation" opacity={0.7} style={{ imageRendering: 'pixelated' }}>
        <PixelRects rects={terrain.elevation} />
      </g>
      <g id="terrain-forest" style={{ imageRendering: 'pixelated' }}>
        <PixelRects rects={terrain.forest} />
      </g>
      <g id="terrain-paths" style={{ imageRendering: 'pixelated' }}>
        <PixelRects rects={terrain.paths} />
      </g>

      <ellipse
        cx={TREE_WORLD.cx}
        cy={TREE_WORLD.cy}
        rx={268}
        ry={215}
        fill="url(#meadow-bright)"
      />

      <g id="terrain-plaza" style={{ imageRendering: 'pixelated' }}>
        <PixelRects rects={terrain.plaza} />
      </g>

      <WorldCentralPlazaGraphic />

      <VillageEnvironmentLayer props={envProps} />

      <g id="terrain-rocks" style={{ imageRendering: 'pixelated' }} opacity={0.4}>
        <PixelRects rects={terrain.rocks} />
      </g>
      <g id="terrain-trees" style={{ imageRendering: 'pixelated' }} opacity={0.4}>
        <PixelRects rects={terrain.smallTrees} />
      </g>

      <g id="building-plots">
        {WORLD_BUILDINGS.filter((def) => !def.terrainOnly).map((def) => {
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

      <g id="buildings" opacity={0.95}>
        {buildingLayers.map((layer) => {
          const def = WORLD_BUILDINGS.find((d) => d.key === layer.buildingKey)
          const plotRy = def?.plotRy ?? 50
          const imgW = layer.size * 1.18
          const imgH = layer.size * 1.18
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
                  plotRx={def?.plotRx ?? 68}
                  plotRy={plotRy}
                  opacity={layer.imageOpacity ?? 1}
                />
              )}
              {layer.pixelRects && (
                <g style={{ imageRendering: 'pixelated' }}>
                  <PixelRects rects={layer.pixelRects} />
                </g>
              )}
              {selectedBuildingKey === layer.buildingKey && (
                <ellipse
                  cx={layer.cx}
                  cy={groundY}
                  rx={(def?.plotRx ?? 68) + 6}
                  ry={(def?.plotRy ?? 50) + 4}
                  fill="none"
                  stroke="#ffca28"
                  strokeWidth={3}
                  opacity={0.9}
                />
              )}
            </g>
          )
        })}
      </g>

      <ellipse
        cx={TREE_WORLD.cx}
        cy={TREE_WORLD.cy + 62}
        rx={treeSize * 0.3}
        ry={treeSize * 0.09}
        fill="#142810"
        opacity={0.38}
      />

      <g id="tree-aura" pointerEvents="none">
        <circle
          cx={TREE_WORLD.cx}
          cy={TREE_WORLD.cy}
          r={treeSize * 0.46}
          fill="url(#tree-growth-aura)"
          opacity={isWorldActive ? 0.9 : 0.55}
        >
          <animate
            attributeName="opacity"
            values={isWorldActive ? '0.7;1;0.7' : '0.45;0.65;0.45'}
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
        <ellipse
          cx={TREE_WORLD.cx}
          cy={TREE_WORLD.cy}
          rx={treeSize * 0.38}
          ry={treeSize * 0.32}
          fill="url(#kingdom-glow)"
        />
      </g>

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
    </svg>
  )
}
