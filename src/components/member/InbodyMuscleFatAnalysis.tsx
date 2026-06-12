import { formatDate } from '../../api/members'
import type { InbodyRecord } from '../../api/inbodyRecords'
import { bodyFatPercent, formatBodyFatPercent } from '../../lib/inbodyMetrics'

type MetricKey = 'weight_kg' | 'skeletal_muscle_kg' | 'body_fat_kg'

type MetricConfig = {
  key: MetricKey | 'body_fat_percent'
  label: string
  subLabel: string
  unit: string
  getValue: (record: InbodyRecord) => number
  formatValue: (value: number) => string
}

const METRICS: MetricConfig[] = [
  {
    key: 'weight_kg',
    label: '체중',
    subLabel: 'Weight',
    unit: 'kg',
    getValue: (r) => r.weight_kg,
    formatValue: (v) => v.toFixed(1),
  },
  {
    key: 'skeletal_muscle_kg',
    label: '골격근량',
    subLabel: 'Skeletal Muscle Mass',
    unit: 'kg',
    getValue: (r) => r.skeletal_muscle_kg,
    formatValue: (v) => v.toFixed(1),
  },
  {
    key: 'body_fat_kg',
    label: '체지방량',
    subLabel: 'Body Fat Mass',
    unit: 'kg',
    getValue: (r) => r.body_fat_kg,
    formatValue: (v) => v.toFixed(1),
  },
  {
    key: 'body_fat_percent',
    label: '체지방률',
    subLabel: 'Percent Body Fat',
    unit: '%',
    getValue: bodyFatPercent,
    formatValue: (v) => formatBodyFatPercent(v).replace('%', ''),
  },
]

function rangeForValues(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || Math.max(max * 0.1, 1)
  return { min: min - span * 0.15, max: max + span * 0.15 }
}

function barFillPercent(value: number, min: number, max: number): number {
  const span = max - min || 1
  const clamped = Math.max(min, Math.min(max, value))
  return ((clamped - min) / span) * 100
}

function buildTicks(min: number, max: number, count = 5): number[] {
  const span = max - min
  if (span <= 0) return [min]
  const step = span / (count - 1)
  return Array.from({ length: count }, (_, i) => min + step * i)
}

type Props = {
  record: InbodyRecord
  history: InbodyRecord[]
}

export function InbodyMuscleFatAnalysis({ record, history }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-charcoal/15 bg-white">
      <div className="border-b border-charcoal/10 bg-cream/40 px-3 py-2">
        <p className="text-sm font-semibold text-charcoal">
          골격근·지방분석{' '}
          <span className="text-xs font-normal text-muted">
            Muscle-Fat Analysis
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted">
          측정일 {formatDate(record.measured_at)}
        </p>
      </div>

      <div className="space-y-4 px-3 py-3 text-xs">
        {METRICS.map((metric) => {
          const value = metric.getValue(record)
          const historyValues = history.map((r) => metric.getValue(r))
          const { min, max } = rangeForValues(historyValues)
          const fill = barFillPercent(value, min, max)
          const ticks = buildTicks(min, max)

          return (
            <div key={metric.key}>
              <p className="mb-1 font-semibold text-charcoal">
                {metric.label}{' '}
                <span className="text-[10px] font-normal text-muted">
                  ({metric.unit}) {metric.subLabel}
                </span>
                {metric.key === 'body_fat_percent' && (
                  <span className="ml-1 text-[10px] font-normal text-muted">
                    · 체지방량÷체중 자동 계산
                  </span>
                )}
              </p>

              <div className="relative h-7 rounded-sm border border-charcoal/15 bg-cream/30">
                <div
                  className="absolute inset-y-0 left-0 bg-charcoal"
                  style={{ width: `${fill}%` }}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-[11px] font-bold tabular-nums text-charcoal"
                  style={{ left: `min(${fill + 1}%, 78%)` }}
                >
                  {metric.key === 'body_fat_percent'
                    ? formatBodyFatPercent(value)
                    : metric.formatValue(value)}
                </span>
              </div>

              <div className="relative mt-1 h-4">
                {ticks.map((tick, i) => {
                  const pos = barFillPercent(tick, min, max)
                  return (
                    <span
                      key={i}
                      className="absolute -translate-x-1/2 text-[9px] tabular-nums text-muted"
                      style={{ left: `${pos}%` }}
                    >
                      {metric.key === 'body_fat_percent'
                        ? tick.toFixed(1)
                        : tick.toFixed(0)}
                      <span
                        className="absolute -top-2 left-1/2 h-1.5 w-px -translate-x-1/2 bg-charcoal/25"
                        aria-hidden
                      />
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
