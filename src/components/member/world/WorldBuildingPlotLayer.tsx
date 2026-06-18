import type { WorldBuildingDef } from './data/worldLayout'
import { TREE_WORLD } from './data/worldLayout'

type Props = {
  building: WorldBuildingDef
  isBuilt: boolean
  isUnlocked: boolean
}

/** 시설 전용 부지 — 건물 아래 레이어, 장소감 연출 */
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

  return (
    <g opacity={dim}>
      <ellipse
        cx={cx}
        cy={groundY + 8}
        rx={plotRx + 14}
        ry={plotRy + 10}
        fill="rgba(30,50,25,0.12)"
      />

      <ellipse
        cx={cx}
        cy={groundY}
        rx={plotRx + 6}
        ry={plotRy + 4}
        fill="#4a7a42"
        opacity={0.35}
      />
      <ellipse
        cx={cx}
        cy={groundY}
        rx={plotRx}
        ry={plotRy}
        fill={isPlaza ? '#c9b896' : '#6aab58'}
        stroke="#4a7a42"
        strokeWidth={3}
      />
      <ellipse
        cx={cx}
        cy={groundY - 4}
        rx={plotRx - 18}
        ry={plotRy - 14}
        fill={isPlaza ? '#ddd0b8' : '#7ec46e'}
        opacity={0.75}
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
        cy={groundY + plotRy - 6}
        rx={plotRx * 0.55}
        ry={8}
        fill="#8d6e4a"
        opacity={0.25}
      />
    </g>
  )
}
