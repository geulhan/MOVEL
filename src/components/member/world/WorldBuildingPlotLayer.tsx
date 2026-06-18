import type { WorldBuildingDef } from './data/worldLayout'

type Props = {
  building: WorldBuildingDef
  isBuilt: boolean
  isUnlocked: boolean
}

/** 시설 부지 — 잔디/광장 바닥 (흙길은 지형 레이어) */
export function BuildingPlotGraphic({ building, isBuilt, isUnlocked }: Props) {
  const { cx, cy, plotRx, plotRy, key } = building
  const groundY = cy + 14
  const dim = !isUnlocked ? 0.45 : !isBuilt ? 0.65 : 1
  const isPlaza = key === 'plaza'

  const grassOuter = isPlaza ? '#8d7a5c' : '#4a7a42'
  const grassMid = isPlaza ? '#c9b896' : '#5f9e52'
  const grassInner = isPlaza ? '#ddd0b8' : '#72c060'
  const grassHighlight = isPlaza ? '#f0e6d4' : '#9ee878'

  return (
    <g opacity={dim}>
      <ellipse
        cx={cx}
        cy={groundY + 10}
        rx={plotRx + 16}
        ry={plotRy + 10}
        fill="rgba(15,32,12,0.16)"
      />

      <ellipse
        cx={cx}
        cy={groundY + 4}
        rx={plotRx + 8}
        ry={plotRy + 5}
        fill="#3d6638"
        opacity={0.38}
      />

      <ellipse
        cx={cx}
        cy={groundY}
        rx={plotRx + 2}
        ry={plotRy + 1}
        fill={grassMid}
        stroke={grassOuter}
        strokeWidth={2.5}
      />

      <ellipse
        cx={cx}
        cy={groundY - 4}
        rx={plotRx - 10}
        ry={plotRy - 8}
        fill={grassInner}
        opacity={0.9}
      />

      <ellipse
        cx={cx - plotRx * 0.2}
        cy={groundY - 7}
        rx={plotRx * 0.32}
        ry={plotRy * 0.26}
        fill={grassHighlight}
        opacity={0.32}
      />

      {isPlaza && (
        <>
          <ellipse
            cx={cx}
            cy={groundY}
            rx={plotRx - 22}
            ry={plotRy - 18}
            fill="#f0e6d4"
            opacity={0.65}
          />
          <ellipse
            cx={cx}
            cy={groundY - 2}
            rx={plotRx - 36}
            ry={plotRy - 28}
            fill="#faf4ea"
            opacity={0.4}
          />
        </>
      )}

      <ellipse
        cx={cx}
        cy={groundY + plotRy - 3}
        rx={plotRx * 0.58}
        ry={8}
        fill="#3a5c32"
        opacity={0.4}
      />
    </g>
  )
}
