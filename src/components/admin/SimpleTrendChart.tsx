import type { DailyTrendPoint } from '../../api/kpi'

type Props = {
  title: string
  points: DailyTrendPoint[]
  color?: string
  className?: string
}

export function SimpleTrendChart({
  title,
  points,
  color = '#c9a227',
  className = '',
}: Props) {
  const max = Math.max(1, ...points.map((p) => p.count))
  const width = 360
  const height = 88
  const barWidth = width / points.length

  return (
    <div
      className={`card flex min-h-[10.5rem] min-w-0 flex-col card-pad ${className}`}
    >
      <p className="text-xs font-medium text-charcoal/55">{title}</p>
      <div className="mt-2 flex flex-1 items-end overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[5.5rem] w-full min-w-[240px]"
          preserveAspectRatio="none"
          role="img"
          aria-label={title}
        >
          {points.map((point, index) => {
            const barHeight = (point.count / max) * (height - 10)
            const x = index * barWidth + barWidth * 0.12
            const w = barWidth * 0.76
            const y = height - barHeight
            return (
              <rect
                key={point.date}
                x={x}
                y={y}
                width={w}
                height={Math.max(barHeight, point.count > 0 ? 2 : 0)}
                fill={color}
                opacity={0.88}
                rx={1.5}
              >
                <title>
                  {point.date}: {point.count}
                </title>
              </rect>
            )
          })}
        </svg>
      </div>
      <p className="mt-2 text-[10px] text-muted">
        최근 30일 · 일별 {title.includes('로그인') ? '로그인' : '인증'} 건수
      </p>
    </div>
  )
}
