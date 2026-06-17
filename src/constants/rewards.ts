/** MOVE SCORE 등급 (누적 점수 기준, 현금 가치 없음) */
import type { PaymentCategory } from './paymentCategories'

export type RewardTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'MOVEL ELITE'

export const REWARD_TIER_LABELS: Record<RewardTier, string> = {
  BRONZE: 'BRONZE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  'MOVEL ELITE': 'MOVEL ELITE',
}

export const TIER_THRESHOLDS: { tier: RewardTier; min: number; max: number }[] = [
  { tier: 'MOVEL ELITE', min: 10000, max: Infinity },
  { tier: 'GOLD', min: 3000, max: 9999 },
  { tier: 'SILVER', min: 1000, max: 2999 },
  { tier: 'BRONZE', min: 0, max: 999 },
]

export function getTierFromScore(score: number): RewardTier {
  if (score >= 10000) return 'MOVEL ELITE'
  if (score >= 3000) return 'GOLD'
  if (score >= 1000) return 'SILVER'
  return 'BRONZE'
}

export function getNextTier(score: number): {
  tier: RewardTier
  remaining: number
} | null {
  if (score >= 10000) return null
  if (score >= 3000) return { tier: 'MOVEL ELITE', remaining: 10000 - score }
  if (score >= 1000) return { tier: 'GOLD', remaining: 3000 - score }
  return { tier: 'SILVER', remaining: 1000 - score }
}

/** 걸음 인증 최소 기준 (7,000보 미만은 반려) */
export const MIN_STEPS_FOR_VERIFICATION = 7000

/** 관리자가 추가하는 맞춤 적립 규칙 */
export type CustomRewardTrigger =
  | 'payment_completed'
  | 'facility_checkin'
  | 'attendance_completed'
  | 'exercise_journal'
  | 'center_photo_approved'
  | 'member_registered'

export const CUSTOM_REWARD_TRIGGERS: CustomRewardTrigger[] = [
  'payment_completed',
  'facility_checkin',
  'attendance_completed',
  'exercise_journal',
  'center_photo_approved',
  'member_registered',
]

export type CustomRewardValueType = 'fixed' | 'payment_percent'

export type CustomRewardRule = {
  id: string
  label: string
  description: string
  trigger: CustomRewardTrigger
  value_type: CustomRewardValueType
  score: number
  mile: number
  /** null이면 모든 결제 구분에 적용 */
  payment_categories: PaymentCategory[] | null
  is_active: boolean
  /** true면 회원당 해당 규칙 1회만 적립 */
  once_per_member: boolean
}

export const CUSTOM_REWARD_TRIGGER_LABELS: Record<CustomRewardTrigger, string> = {
  payment_completed: '결제 완료 시',
  facility_checkin: '출입 완료 시',
  attendance_completed: '출석 완료 시',
  exercise_journal: '운동일지 작성 시',
  center_photo_approved: '센터 인증 승인 시',
  member_registered: '회원 등록 시',
}

export function isPaymentCustomRewardTrigger(
  trigger: CustomRewardTrigger,
): boolean {
  return trigger === 'payment_completed'
}

export const CUSTOM_REWARD_VALUE_TYPE_LABELS: Record<
  CustomRewardValueType,
  string
> = {
  fixed: '고정 포인트',
  payment_percent: '결제금액 비율 (%)',
}

export function createEmptyCustomRewardRule(): CustomRewardRule {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: '',
    description: '',
    trigger: 'payment_completed',
    value_type: 'payment_percent',
    score: 0,
    mile: 5,
    payment_categories: null,
    is_active: true,
    once_per_member: false,
  }
}

/** 기본 적립 규칙 (reward_settings 미설정 시 폴백) */
export type RewardEarnRule = { score: number; mile: number }

export type RewardEarnRules = {
  pt_attendance: RewardEarnRule
  steps_7000: RewardEarnRule
  steps_10000: RewardEarnRule
  steps_15000: RewardEarnRule
  exercise_journal: RewardEarnRule
  streak_7day: RewardEarnRule
  naver_review: RewardEarnRule
  center_photo: RewardEarnRule
  referral_percent: number
  custom_rules: CustomRewardRule[]
}

export const DEFAULT_REWARD_RULES: RewardEarnRules = {
  pt_attendance: { score: 20, mile: 500 },
  steps_7000: { score: 10, mile: 300 },
  steps_10000: { score: 15, mile: 500 },
  steps_15000: { score: 20, mile: 700 },
  exercise_journal: { score: 5, mile: 100 },
  streak_7day: { score: 50, mile: 3000 },
  naver_review: { score: 0, mile: 10000 },
  center_photo: { score: 20, mile: 500 },
  referral_percent: 10,
  custom_rules: [],
}

export const MILE_EXPIRY_MONTHS = 12
export const REDEMPTION_MAX_PERCENT = 20
export const STEP_THRESHOLDS = [7000, 10000, 15000] as const

/** 건강앱 목표 걸음수로 자주 나오는 값 — OCR 오인 방지 */
export const COMMON_STEP_GOALS = [
  3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000,
] as const

export const STEP_REWARD_TIERS = [
  { key: 'steps_7000' as const, min: 7000 },
  { key: 'steps_10000' as const, min: 10000 },
  { key: 'steps_15000' as const, min: 15000 },
]
export const STREAK_DAYS = 7

export type RewardEventType =
  | 'pt_attendance'
  | 'steps_7000'
  | 'steps_10000'
  | 'steps_15000'
  | 'exercise_journal'
  | 'streak_7day'
  | 'naver_review'
  | 'center_photo'
  | 'referral_referrer'
  | 'referral_new_member'
  | 'redemption'
  | 'mile_expiry'
  | 'manual_adjust'
  | 'custom_reward'

export const REWARD_EVENT_LABELS: Record<RewardEventType, string> = {
  pt_attendance: 'PT 출석',
  steps_7000: '7,000보 달성',
  steps_10000: '10,000보 달성',
  steps_15000: '15,000보 달성',
  exercise_journal: '운동일지 작성',
  streak_7day: '7일 연속 활동',
  naver_review: '네이버 리뷰',
  center_photo: '센터 사진 인증',
  referral_referrer: '지인 소개 (소개자)',
  referral_new_member: '지인 소개 (신규 회원)',
  redemption: '재등록 결제 사용',
  mile_expiry: 'MILE 유효기간 만료',
  manual_adjust: '관리자 수동 조정',
  custom_reward: '추가 적립',
}
