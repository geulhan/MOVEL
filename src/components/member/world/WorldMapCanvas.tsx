import { useMemo } from 'react'
import { ARTBOARD_SIZE } from '../pixel/pixelTypes'
import { VILLAGE_BUILDING_EXTERIOR } from './data/villageAssets'
import { TREE_WORLD, WORLD_BUILDINGS } from './data/worldLayout'
import type { WorldBuildingState } from './hooks/useVillageWorldState'
import type { WorldBuildingKey } from './data/worldLayout'
import { generateWorldEnvironment } from './data/worldEnvironment'
import { VillageEnvironmentLayer } from './VillageEnvironmentLayer'
import { VillageNpcLayer } from './VillageNpcLayer'
import { VillageFloatingRewards } from './VillageFloatingRewards'
import { BuildingPlotGraphic } from './WorldBuildingPlotLayer'
import { WorldBuildingExteriorGraphic } from './WorldBuildingExteriorGraphic'
import { WorldCentralPlazaGraphic } from './WorldCentralPlazaGraphic'
import { WorldGrassBackdrop } from './WorldGrassBackdrop'
import { WorldKingdomTreeGraphic } from './WorldKingdomTreeGraphic'

type Props = {
  treeStageKey: string
  buildings: WorldBuildingState[]
  selectedBuildingKey: string | null
  isWorldActive?: boolean
  exerciseEventsSinceCollect?: number
}

const BUILDING_IMG_SCALE = 1.55

type BuildingLayer = {
  key: string
  cx: number
  cy: number
  size: number
  built: boolean
  unlocked: boolean
  buildingKey: WorldBuildingKey
  imageUrl?: string
  imageOpacity?: number
}

function LockedBuildingOverlay({
  cx,
  cy,
  groundY,
  plotRx,
  plotRy,
}: {
  cx: number
  cy: number
  groundY: number
  plotRx: number
  plotRy: number
}) {
  return (
    <g>
      <ellipse
        cx={cx}
        cy={groundY}
        rx={plotRx + 4}
        ry={plotRy + 2}
        fill="#b0bec5"
        opacity={0.75}
      />
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fontSize={28}
        opacity={0.85}
      >
        🔒
      </text>
    </g>
  )
}

export function WorldMapCanvas({
  treeStageKey,
  buildings,
  selectedBuildingKey,
  isWorldActive = false,
  exerciseEventsSinceCollect = 0,
}: Props) {
  const envProps = useMemo(() => generateWorldEnvironment(), [])

  const buildingLayers = useMemo((): BuildingLayer[] => {
    const layers: BuildingLayer[] = []

    for (const b of buildings) {
      const def = WORLD_BUILDINGS.find((d) => d.key === b.key)
      if (def?.terrainOnly) continue

      const size = b.drawSize

      if (!b.isUnlocked) {
        layers.push({
          key: `${b.key}-locked`,
          cx: b.cx,
          cy: b.cy,
          size,
          built: false,
          unlocked: false,
          buildingKey: b.key,
          imageUrl: VILLAGE_BUILDING_EXTERIOR[b.key],
          imageOpacity: 0.22,
        })
        continue
      }

      if (!b.isBuilt) {
        layers.push({
          key: `${b.key}-site`,
          imageUrl: VILLAGE_BUILDING_EXTERIOR[b.key],
          imageOpacity: 0.55,
          cx: b.cx,
          cy: b.cy,
          size,
          built: false,
          unlocked: true,
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
        unlocked: true,
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
          <stop offset="0%" stopColor="#8ecae6" />
          <stop offset="55%" stopColor="#c5e8f7" />
          <stop offset="100%" stopColor="#a8d98a" />
        </linearGradient>
        <radialGradient id="wm-grass-base" cx="50%" cy="48%" r="68%">
          <stop offset="0%" stopColor="#8ed472" />
          <stop offset="55%" stopColor="#6cb85c" />
          <stop offset="100%" stopColor="#4a8f42" />
        </radialGradient>
        <radialGradient id="wm-meadow-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8ffb8" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#6aab58" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="wm-vignette" cx="50%" cy="50%" r="58%">
          <stop offset="55%" stopColor="#000000" stopOpacity={0} />
          <stop offset="100%" stopColor="#1a3018" stopOpacity={0.22} />
        </radialGradient>
        <radialGradient id="tree-growth-aura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9AEA72" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#3E9638" stopOpacity={0} />
        </radialGradient>
        <filter
          id="wm-building-shadow"
          x="-40%"
          y="-30%"
          width="180%"
          height="170%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0f2010" floodOpacity="0.4" />
        </filter>
        <filter
          id="wm-tree-shadow"
          x="-35%"
          y="-25%"
          width="170%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#142810" floodOpacity="0.45" />
        </filter>
      </defs>

      <rect width={ARTBOARD_SIZE} height={280} fill="url(#wm-sky)" />
      <circle cx={800} cy={68} r={38} fill="#fff9c4" />
      <circle cx={800} cy={68} r={50} fill="#fff59d" opacity={0.22} />
      <ellipse cx={200} cy={90} rx={95} ry={32} fill="#ffffff" opacity={0.5} />
      <ellipse cx={760} cy={78} rx={85} ry={28} fill="#ffffff" opacity={0.42} />

      <WorldGrassBackdrop />

      <WorldCentralPlazaGraphic />

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

      <VillageEnvironmentLayer props={envProps} />

      <g id="buildings">
        {buildingLayers.map((layer) => {
          const def = WORLD_BUILDINGS.find((d) => d.key === layer.buildingKey)
          const plotRy = def?.plotRy ?? 56
          const imgW = layer.size * BUILDING_IMG_SCALE
          const imgH = layer.size * BUILDING_IMG_SCALE
          const imgX = layer.cx - imgW / 2
          const groundY = layer.cy + 14
          const imgY = groundY - imgH + plotRy * 0.42

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
                  plotRx={def?.plotRx ?? 78}
                  plotRy={plotRy}
                  opacity={layer.imageOpacity ?? 1}
                />
              )}
              {!layer.unlocked && (
                <LockedBuildingOverlay
                  cx={layer.cx}
                  cy={layer.cy}
                  groundY={groundY}
                  plotRx={def?.plotRx ?? 78}
                  plotRy={plotRy}
                />
              )}
              {layer.unlocked && !layer.built && (
                <text
                  x={layer.cx}
                  y={layer.cy - 20}
                  textAnchor="middle"
                  fill="#5d4037"
                  fontSize={11}
                  fontWeight="700"
                  fontFamily="system-ui,sans-serif"
                  stroke="#fff"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  건설 가능
                </text>
              )}
              {selectedBuildingKey === layer.buildingKey && (
                <ellipse
                  cx={layer.cx}
                  cy={groundY}
                  rx={(def?.plotRx ?? 78) + 8}
                  ry={(def?.plotRy ?? 56) + 5}
                  fill="none"
                  stroke="#ffc107"
                  strokeWidth={3}
                  opacity={0.95}
                />
              )}
            </g>
          )
        })}
      </g>

      <g id="tree-aura" pointerEvents="none">
        <circle
          cx={TREE_WORLD.cx}
          cy={TREE_WORLD.cy}
          r={treeSize * 0.52}
          fill="url(#tree-growth-aura)"
          opacity={isWorldActive ? 0.85 : 0.5}
        >
          <animate
            attributeName="opacity"
            values={isWorldActive ? '0.65;0.9;0.65' : '0.4;0.55;0.4'}
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
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
