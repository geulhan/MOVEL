import { VILLAGE_ROAD_NETWORK } from './data/campusRoads'
import { PLAZA_HUB, TREE_WORLD, WORLD_SIZE } from './data/worldLayout'

function pathD(points: [number, number][]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')}`
}

export function WorldGrassBackdrop() {
  const { cx, cy, rx, ry } = PLAZA_HUB

  return (
    <g id="grass-backdrop">
      <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="#5a9e52" />
      <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#wm-grass-base)" />

      <ellipse
        cx={TREE_WORLD.cx}
        cy={TREE_WORLD.cy}
        rx={340}
        ry={300}
        fill="url(#wm-meadow-glow)"
      />

      <ellipse
        cx={cx}
        cy={cy}
        rx={rx + 36}
        ry={ry + 28}
        fill="#c9b896"
        opacity={0.55}
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="#e8dcc8"
        opacity={0.7}
      />

      {VILLAGE_ROAD_NETWORK.map((polyline, i) => (
        <g key={`road-${i}`}>
          <path
            d={pathD(polyline)}
            fill="none"
            stroke="#8d6e4a"
            strokeWidth={34}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
          <path
            d={pathD(polyline)}
            fill="none"
            stroke="#d4bc96"
            strokeWidth={22}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}

      <rect
        width={WORLD_SIZE}
        height={WORLD_SIZE}
        fill="url(#wm-vignette)"
        pointerEvents="none"
      />
    </g>
  )
}
