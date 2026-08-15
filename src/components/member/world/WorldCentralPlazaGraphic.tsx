import { PLAZA_HUB } from './data/worldLayout'

/** 중앙 운동광장 — 석재 타일 타운스퀘어 (건물 에셋 아님) */
export function WorldCentralPlazaGraphic() {
  const { cx, cy, rx, ry } = PLAZA_HUB

  const tiles = []
  const step = 22
  for (let row = -4; row <= 4; row += 1) {
    for (let col = -5; col <= 5; col += 1) {
      const tx = cx + col * step + (row % 2) * (step / 2)
      const ty = cy + row * step * 0.72
      const dx = (tx - cx) / rx
      const dy = (ty - cy) / ry
      if (dx * dx + dy * dy > 0.82) continue
      const light = (col + row) % 2 === 0
      tiles.push(
        <rect
          key={`${col}-${row}`}
          x={tx - step / 2 + 1}
          y={ty - step / 2 + 1}
          width={step - 2}
          height={step * 0.65}
          rx={3}
          fill={light ? '#e8dcc8' : '#d4c4a8'}
          stroke="#b8a888"
          strokeWidth={0.8}
          opacity={0.92}
        />,
      )
    }
  }

  return (
    <g id="central-plaza">
      <ellipse
        cx={cx}
        cy={cy + 8}
        rx={rx + 14}
        ry={ry + 10}
        fill="rgba(20,40,18,0.14)"
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx + 6}
        ry={ry + 4}
        fill="#8d7a5c"
        opacity={0.35}
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="#c9b896"
        stroke="#9a8468"
        strokeWidth={3}
      />
      <g>{tiles}</g>
      <g id="plaza-furniture" opacity={0.95}>
        <ellipse cx={cx} cy={cy + 12} rx={28} ry={14} fill="#8d6e63" opacity={0.85} />
        <ellipse cx={cx} cy={cy + 10} rx={22} ry={11} fill="#a1887f" />
        <rect x={cx - 34} y={cy + 22} width={12} height={10} rx={2} fill="#6d4c41" />
        <rect x={cx + 22} y={cy + 22} width={12} height={10} rx={2} fill="#6d4c41" />
        <rect x={cx - 38} y={cy + 18} width={18} height={4} rx={1} fill="#8d6e63" />
        <rect x={cx + 20} y={cy + 18} width={18} height={4} rx={1} fill="#8d6e63" />
      </g>
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx - 28}
        ry={ry - 22}
        fill="#f0e6d4"
        opacity={0.25}
      />
    </g>
  )
}
