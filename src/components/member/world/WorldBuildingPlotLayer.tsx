import type { WorldBuildingDef } from './data/worldLayout'
import { TREE_WORLD } from './data/worldLayout'

type Props = {
  building: WorldBuildingDef
  isBuilt: boolean
  isUnlocked: boolean
}

/** 시설 전용 부지 — 잔디 위에 건물이 놓인 장소감 */
export function BuildingPlotGraphic({ building, isBuilt, isUnlocked }: Props) {
  const { cx, cy, plotRx, plotRy, key } = building
  const hubX = TREE_WORLD.cx
  const hubY = TREE_WORLD.cy
  const groundY = cy + 14
  const dim = !isUnlocked ? 0.45 : !isBuilt ? 0.65 : 1
  const isPlaza = key === 'plaza'

  const angle = Math.atan2(cy - hubY, cx - hubX)
  const entranceX = cx - Math.cos(angle) * (plotRx - 18)
  const entranceY = groundY - Math.sin(angle) * (plotRy - 14)

  const grassOuter = isPlaza ? '#8d7a5c' : '#4a7a42'
  const grassMid = isPlaza ? '#c9b896' : '#5f9e52'
  const grassInner = isPlaza ? '#ddd0b8' : '#72c060'
  const grassHighlight = isPlaza ? '#e8dcc8' : '#8ed67a'

  return (
    <g opacity={dim}>
      <ellipse
        cx={cx}
        cy={groundY + 10}
        rx={plotRx + 18}
        ry={plotRy + 12}
        fill="rgba(15,32,12,0.18)"
      />

      <ellipse
        cx={cx}
        cy={groundY + 4}
        rx={plotRx + 10}
        ry={plotRy + 6}
        fill="#3d6638"
        opacity={0.4}
      />

      <ellipse
        cx={cx}
        cy={groundY}
        rx={plotRx + 4}
        ry={plotRy + 2}
        fill={grassMid}
        stroke={grassOuter}
        strokeWidth={3}
      />

      <ellipse
        cx={cx}
        cy={groundY - 5}
        rx={plotRx - 12}
        ry={plotRy - 10}
        fill={grassInner}
        opacity={0.88}
      />

      <ellipse
        cx={cx - plotRx * 0.22}
        cy={groundY - 8}
        rx={plotRx * 0.35}
        ry={plotRy * 0.28}
        fill={grassHighlight}
        opacity={0.35}
      />
      <ellipse
        cx={cx + plotRx * 0.18}
        cy={groundY - 3}
        rx={plotRx * 0.28}
        ry={plotRy * 0.22}
        fill={grassHighlight}
        opacity={0.22}
      />

      <line
        x1={entranceX}
        y1={entranceY}
        x2={hubX + Math.cos(angle) * 95}
        y2={hubY + Math.sin(angle) * 95}
        stroke="#c9ad82"
        strokeWidth={14}
        strokeLinecap="round"
        opacity={0.85}
      />
      <line
        x1={entranceX}
        y1={entranceY}
        x2={hubX + Math.cos(angle) * 95}
        y2={hubY + Math.sin(angle) * 95}
        stroke="#d4bc96"
        strokeWidth={8}
        strokeLinecap="round"
        opacity={0.9}
      />

      {isPlaza && (
        <ellipse
          cx={cx}
          cy={groundY}
          rx={plotRx - 28}
          ry={plotRy - 22}
          fill="#e8dcc8"
          opacity={0.55}
        />
      )}

      <ellipse
        cx={cx}
        cy={groundY + plotRy - 4}
        rx={plotRx * 0.62}
        ry={9}
        fill="#3a5c32"
        opacity={0.45}
      />

      <ellipse
        cx={cx}
        cy={groundY + plotRy * 0.35}
        rx={plotRx * 0.48}
        ry={6}
        fill="#2d4a28"
        opacity={0.3}
      />
    </g>
  )
}
