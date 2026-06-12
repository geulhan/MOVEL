import type { InbodyRecord } from '../api/inbodyRecords'

export type InbodyMetricId =
  | 'weight_kg'
  | 'skeletal_muscle_kg'
  | 'body_fat_kg'
  | 'body_fat_percent'

export type InbodyChartScale = {
  min: number
  max: number
  ticks: number[]
}

/** 인바디 그래프 고정 축 범위 */
export const INBODY_CHART_SCALES: Record<InbodyMetricId, InbodyChartScale> = {
  weight_kg: { min: 0, max: 150, ticks: [0, 30, 60, 90, 120, 150] },
  skeletal_muscle_kg: { min: 0, max: 60, ticks: [0, 12, 24, 36, 48, 60] },
  body_fat_kg: { min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] },
  body_fat_percent: { min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] },
}

/** 체지방률(%) = 체지방량(kg) ÷ 체중(kg) × 100 */
export function bodyFatPercent(record: InbodyRecord): number {
  if (record.weight_kg <= 0) return 0
  return (record.body_fat_kg / record.weight_kg) * 100
}

export function formatBodyFatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function valueOnChartScale(
  value: number,
  scale: InbodyChartScale,
): number {
  const { min, max } = scale
  const span = max - min || 1
  const clamped = Math.max(min, Math.min(max, value))
  return ((clamped - min) / span) * 100
}

const MIN_SPAN: Record<InbodyMetricId, number> = {
  weight_kg: 12,
  skeletal_muscle_kg: 6,
  body_fat_kg: 10,
  body_fat_percent: 12,
}

function buildTicks(min: number, max: number, count = 5): number[] {
  const span = max - min
  if (span <= 0) return [min]
  const step = span / (count - 1)
  return Array.from({ length: count }, (_, i) => min + step * i)
}

/** 측정 이력 기준 동적 축 — 변화가 잘 보이도록, 절대 범위 안에서만 조정 */
export function resolveChartScale(
  values: number[],
  metricId: InbodyMetricId,
): InbodyChartScale {
  const absolute = INBODY_CHART_SCALES[metricId]
  if (values.length === 0) return absolute

  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const mid = (dataMin + dataMax) / 2
  let span = dataMax - dataMin

  if (span < MIN_SPAN[metricId]) {
    span = MIN_SPAN[metricId]
  } else {
    span *= 1.4
  }

  let min = mid - span / 2
  let max = mid + span / 2

  if (min < absolute.min) {
    max += absolute.min - min
    min = absolute.min
  }
  if (max > absolute.max) {
    min -= max - absolute.max
    max = absolute.max
  }

  min = Math.max(absolute.min, min)
  max = Math.min(absolute.max, max)

  if (max - min < MIN_SPAN[metricId] * 0.5) {
    const center = (dataMin + dataMax) / 2
    min = Math.max(absolute.min, center - MIN_SPAN[metricId] / 2)
    max = Math.min(absolute.max, center + MIN_SPAN[metricId] / 2)
  }

  return {
    min,
    max,
    ticks: buildTicks(min, max),
  }
}
