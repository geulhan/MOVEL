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
  const clamped = Math.max(min, Math.min(max, value))
  return ((clamped - min) / (max - min)) * 100
}
