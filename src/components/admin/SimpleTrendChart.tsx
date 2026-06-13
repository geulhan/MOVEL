import type { DailyTrendPoint } from '../../api/kpi'

type Props = {
  title: string
  points: DailyTrendPoint[]
  color?: string
}

export function SimpleTrendChart({
  title,
  points,
  color = '#c9a227',
}: Props) {
  const max = Math.max(1, ...points.map((p) => p.count))
  const width = 320
  const height = 72
  const barWidth = width / points.length

  return (
    <div className="card min-w-0 card-pad">
      <p className="text-xs font-medium text-charcoal/55">{title}</p>
      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-20 w-full min-w-[280px]"
          role="img"
          aria-label={title}
        >
          {points.map((point, index) => {
            const barHeight = (point.count / max) * (height - 8)
            const x = index * barWidth + barWidth * 0.15
            const w = barWidth * 0.7
            const y = height - barHeight
            return (
              <rect
                key={point.date}
                x={x}
                y={y}
                width={w}
                height={Math.max(barHeight, point.count > 0 ? 2 : 0)}
                fill={color}
                opacity={0.85}
                rx={1}
              >
                <title>
                  {point.date}: {point.count}
                </title>
              </rect>
            )
          })}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-muted">
        최근 30일 · 일별 {title.includes('로그인') ? '로그인' : '인증'} 건수
      </p>
    </div>
  )
}
