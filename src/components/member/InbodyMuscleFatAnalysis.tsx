import { formatDate } from '../../api/members'
import type { InbodyRecord } from '../../api/inbodyRecords'

type MetricKey = 'weight_kg' | 'skeletal_muscle_kg' | 'body_fat_kg'

type MetricConfig = {
  key: MetricKey
  label: string
  subLabel: string
  unit: string
  scaleMin: number
  scaleMax: number
  ticks: number[]
}

const METRICS: MetricConfig[] = [
  {
    key: 'weight_kg',
    label: '체중',
    subLabel: 'Weight',
    unit: 'kg',
    scaleMin: 55,
    scaleMax: 205,
    ticks: [55, 75, 95, 115, 135, 155, 175, 195],
  },
  {
    key: 'skeletal_muscle_kg',
    label: '골격근량',
    subLabel: 'Skeletal Muscle Mass',
    unit: 'kg',
    scaleMin: 70,
    scaleMax: 170,
    ticks: [70, 90, 110, 130, 150, 170],
  },
  {
    key: 'body_fat_kg',
    label: '체지방량',
    subLabel: 'Body Fat Mass',
    unit: 'kg',
    scaleMin: 40,
    scaleMax: 460,
    ticks: [40, 120, 200, 280, 360, 440],
  },
]

function referenceFor(
  records: InbodyRecord[],
  key: MetricKey,
): number {
  const oldest = records[records.length - 1]
  if (oldest) return oldest[key]
  const latest = records[0]
  return latest?.[key] ?? 1
}

function percentOfReference(value: number, reference: number): number {
  if (reference <= 0) return 100
  return (value / reference) * 100
}

function barPosition(percent: number, scaleMin: number, scaleMax: number): number {
  const clamped = Math.max(scaleMin, Math.min(scaleMax, percent))
  return ((clamped - scaleMin) / (scaleMax - scaleMin)) * 100
}

function zonePosition(percent: number, scaleMin: number, scaleMax: number): number {
  return barPosition(percent, scaleMin, scaleMax)
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
          <span className="text-xs font-normal text-muted">Muscle-Fat Analysis</span>
        </p>
        <p className="mt-0.5 text-xs text-muted">
          측정일 {formatDate(record.measured_at)}
        </p>
      </div>

      <div className="grid grid-cols-[5.5rem_1fr] text-xs">
        <div className="border-r border-charcoal/10 bg-cream/20 px-2 py-2 text-center text-[10px] text-muted">
          <div className="h-6" />
          <div className="grid h-28 grid-rows-3 items-center">
            <span>표준이하</span>
            <span>표준</span>
            <span>표준이상</span>
          </div>
        </div>

        <div className="px-2 py-2">
          <div className="mb-1 flex justify-between text-[10px] text-muted">
            <span>Under</span>
            <span>Normal</span>
            <span>Over</span>
          </div>

          <div className="space-y-4">
            {METRICS.map((metric) => {
              const value = record[metric.key]
              const reference = referenceFor(history, metric.key)
              const percent = percentOfReference(value, reference)
              const fill = barPosition(percent, metric.scaleMin, metric.scaleMax)
              const underEnd = zonePosition(85, metric.scaleMin, metric.scaleMax)
              const overStart = zonePosition(115, metric.scaleMin, metric.scaleMax)

              return (
                <div key={metric.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-charcoal">
                      {metric.label}{' '}
                      <span className="text-[10px] font-normal text-muted">
                        ({metric.unit}) {metric.subLabel}
                      </span>
                    </p>
                  </div>

                  <div className="relative h-7 rounded-sm border border-charcoal/15 bg-white">
                    <div
                      className="absolute inset-y-0 left-0 bg-charcoal/5"
                      style={{ width: `${underEnd}%` }}
                    />
                    <div
                      className="absolute inset-y-0 bg-charcoal/10"
                      style={{ left: `${underEnd}%`, width: `${overStart - underEnd}%` }}
                    />
                    <div
                      className="absolute inset-y-0 right-0 bg-amber-100/80"
                      style={{ width: `${100 - overStart}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-charcoal"
                      style={{ width: `${fill}%` }}
                    />
                    <span
                      className="absolute top-1/2 -translate-y-1/2 text-[11px] font-bold tabular-nums text-charcoal"
                      style={{ left: `min(${fill + 1}%, 78%)` }}
                    >
                      {value.toFixed(1)}
                    </span>
                  </div>

                  <div className="relative mt-1 h-4">
                    {metric.ticks.map((tick) => {
                      const pos = barPosition(tick, metric.scaleMin, metric.scaleMax)
                      return (
                        <span
                          key={tick}
                          className="absolute -translate-x-1/2 text-[9px] tabular-nums text-muted"
                          style={{ left: `${pos}%` }}
                        >
                          {tick}
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
      </div>
    </div>
  )
}
