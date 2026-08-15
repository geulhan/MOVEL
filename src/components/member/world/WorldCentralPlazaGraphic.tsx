import { PLAZA_HUB } from './data/worldLayout'

/** 중앙 운동광장 — 부드러운 타운스퀘어 */
export function WorldCentralPlazaGraphic() {
  const { cx, cy, rx, ry } = PLAZA_HUB

  return (
    <g id="central-plaza">
      <ellipse
        cx={cx}
        cy={cy + 10}
        rx={rx + 16}
        ry={ry + 12}
        fill="rgba(20,40,18,0.12)"
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx + 4}
        ry={ry + 2}
        fill="#d8c8a8"
        stroke="#b8a888"
        strokeWidth={2.5}
      />
      <ellipse
        cx={cx}
        cy={cy - 2}
        rx={rx - 24}
        ry={ry - 18}
        fill="#f0e6d4"
        opacity={0.85}
      />
      <g id="plaza-furniture" opacity={0.95}>
        <ellipse cx={cx} cy={cy + 14} rx={30} ry={15} fill="#8d6e63" opacity={0.9} />
        <ellipse cx={cx} cy={cy + 12} rx={24} ry={12} fill="#a1887f" />
        <rect x={cx - 36} y={cy + 24} width={14} height={10} rx={2} fill="#6d4c41" />
        <rect x={cx + 22} y={cy + 24} width={14} height={10} rx={2} fill="#6d4c41" />
      </g>
    </g>
  )
}
