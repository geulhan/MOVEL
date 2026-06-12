import type { InbodyRecord } from '../api/inbodyRecords'

/** 체지방률(%) = 체지방량(kg) ÷ 체중(kg) × 100 */
export function bodyFatPercent(record: InbodyRecord): number {
  if (record.weight_kg <= 0) return 0
  return (record.body_fat_kg / record.weight_kg) * 100
}

export function formatBodyFatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
