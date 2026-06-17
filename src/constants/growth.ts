import type { GrowthEventType } from '../types/growth'

/** 걸음 인증 시 성장치·도토리 구간 (마일리지와 별도) */
export const STEP_GROWTH_TIERS: {
  min: number
  eventType: GrowthEventType
}[] = [
  { min: 3000, eventType: 'STEPS_3000' },
  { min: 5000, eventType: 'STEPS_5000' },
  { min: 7000, eventType: 'STEPS_7000' },
  { min: 10000, eventType: 'STEPS_10000' },
  { min: 15000, eventType: 'STEPS_15000' },
]

export const STEP_GROWTH_THRESHOLDS = STEP_GROWTH_TIERS.map((tier) => tier.min)
