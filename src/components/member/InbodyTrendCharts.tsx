import type { InbodyRecord } from '../../api/inbodyRecords'
import { bodyFatPercent } from '../../lib/inbodyMetrics'

type MetricConfig = {
  id: string
  label: string
  unit: string
  higherIsBetter: boolean
  getValue: (record: InbodyRecord) => number
  formatValue: (value: number) => string
}

const METRICS: MetricConfig[] = [
  {
    id: 'weight_kg',
    label: '체중',
    unit: 'kg',
    higherIsBetter: false,
    getValue: (r) => r.weight_kg,
    formatValue: (v) => v.toFixed(1),
  },
  {
    id: 'skeletal_muscle_kg',
    label: '골격근량',
    unit: 'kg',
    higherIsBetter: true,
    getValue: (r) => r.skeletal_muscle_kg,
    formatValue: (v) => v.toFixed(1),
  },
  {
    id: 'body_fat_kg',
    label: '체지방량',
    unit: 'kg',
    higherIsBetter: false,
    getValue: (r) => r.body_fat_kg,
    formatValue: (v) => v.toFixed(1),
  },
  {
    id: 'body_fat_percent',
    label: '체지방률',
    unit: '%',
    higherIsBetter: false,
    getValue: bodyFatPercent,
    formatValue: (v) => `${v.toFixed(1)}%`,
  },
]

const CHART_W = 320
const CHART_H = 120
const PAD_TOP = 28
const PAD_BOTTOM = 24
const PAD_X = 16

type ChartPoint = {
  record: InbodyRecord
  value: number
  x: number
  y: number
  color: string
}

function formatAxisDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

function formatTooltipDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yy}.${mm}.${dd} ${hh}:${min}`
}

function dotColor(
  value: number,
  prev: number | null,
  higherIsBetter: boolean,
): string {
  if (prev == null) return '#9ca3af'
  if (value === prev) return '#9ca3af'
  const improved = higherIsBetter ? value > prev : value < prev
  return improved ? '#0d9488' : '#ef4444'
}

function buildPoints(
  records: InbodyRecord[],
  metric: MetricConfig,
): ChartPoint[] {
  const sorted = [...records].sort((a, b) => {
    const cmp = a.measured_at.localeCompare(b.measured_at)
    if (cmp !== 0) return cmp
    return a.created_at.localeCompare(b.created_at)
  })

  const values = sorted.map((r) => metric.getValue(r))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || Math.max(max * 0.1, 1)
  const yMin = min - span * 0.2
  const yMax = max + span * 0.35
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM
  const plotW = CHART_W - PAD_X * 2

  return sorted.map((record, i) => {
    const value = metric.getValue(record)
    const prev = i > 0 ? metric.getValue(sorted[i - 1]) : null
    const x =
      sorted.length === 1
        ? PAD_X + plotW / 2
        : PAD_X + (i / (sorted.length - 1)) * plotW
    const y =
      PAD_TOP + plotH - ((value - yMin) / (yMax - yMin)) * plotH

    return {
      record,
      value,
      x,
      y,
      color: dotColor(value, prev, metric.higherIsBetter),
    }
  })
}

function linePath(points: ChartPoint[]): string {
  if (points.length < 2) return ''
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
}

function gridLines(points: ChartPoint[]): number[] {
  if (points.length === 0) return []
  const ys = points.map((p) => p.y)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const mid = (minY + maxY) / 2
  return [maxY, mid, minY]
}

type ChartCardProps = {
  metric: MetricConfig
  records: InbodyRecord[]
}

function TrendChartCard({ metric, records }: ChartCardProps) {
  const points = buildPoints(records, metric)
  const latest = points[points.length - 1]
  const path = linePath(points)
  const grids = gridLines(points)

  return (
    <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-sm">
      <div className="px-4 pt-4 pb-1">
        <h4 className="text-sm font-semibold text-charcoal">
          {metric.label}{' '}
          <span className="font-normal text-muted">({metric.unit})</span>
        </h4>
        {metric.id === 'body_fat_percent' && (
          <p className="mt-0.5 text-[10px] text-muted">
            체지방량 ÷ 체중으로 자동 계산
          </p>
        )}
      </div>

      <div className="relative px-2 pb-3">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="mx-auto block w-full max-w-md"
          role="img"
          aria-label={`${metric.label} 변화 그래프`}
        >
          {grids.map((y, i) => (
            <line
              key={i}
              x1={PAD_X}
              y1={y}
              x2={CHART_W - PAD_X}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {path && (
            <path
              d={path}
              fill="none"
              stroke="#374151"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {latest && (
            <line
              x1={latest.x}
              y1={PAD_TOP - 4}
              x2={latest.x}
              y2={CHART_H - PAD_BOTTOM + 4}
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          )}

          {points.map((p) => (
            <g key={p.record.id}>
              <circle cx={p.x} cy={p.y} r="5" fill={p.color} />
              <circle
                cx={p.x}
                cy={p.y}
                r="7"
                fill="none"
                stroke={p.color}
                strokeWidth="1.5"
                opacity="0.35"
              />
              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                className="fill-charcoal text-[11px] font-semibold"
                style={{ fontSize: 11 }}
              >
                {metric.formatValue(p.value)}
              </text>
            </g>
          ))}
        </svg>

        {latest && (
          <div
            className="pointer-events-none absolute top-1 rounded-md bg-charcoal/75 px-2 py-1 text-[10px] font-medium text-white tabular-nums shadow"
            style={{
              left: `clamp(8px, ${((latest.x / CHART_W) * 100).toFixed(1)}%, calc(100% - 120px))`,
            }}
          >
            {formatTooltipDate(latest.record.measured_at)}{' '}
            {metric.formatValue(latest.value)}
          </div>
        )}

        <div className="relative mx-auto mt-1 h-5 max-w-md">
          {points.map((p) => (
            <span
              key={`${p.record.id}-axis`}
              className="absolute -translate-x-1/2 text-[10px] tabular-nums text-muted"
              style={{ left: `${(p.x / CHART_W) * 100}%` }}
            >
              {formatAxisDate(p.record.measured_at)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

type Props = {
  records: InbodyRecord[]
}

export function InbodyTrendCharts({ records }: Props) {
  if (records.length < 2) {
    return (
      <div className="rounded-xl border border-gold/25 bg-cream/30 px-4 py-3 text-sm text-muted">
        변화 그래프는 측정 기록이 2회 이상일 때 표시됩니다.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-charcoal">변화</h4>
        <p className="mt-0.5 text-xs text-muted">
          측정 이력을 기준으로 체성분 변화를 확인합니다.
        </p>
      </div>
      {METRICS.map((metric) => (
        <TrendChartCard key={metric.id} metric={metric} records={records} />
      ))}
    </div>
  )
}
