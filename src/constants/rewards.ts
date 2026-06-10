/** MOVE SCORE 등급 (누적 점수 기준, 현금 가치 없음) */
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

/** 기본 적립 규칙 (reward_settings 미설정 시 폴백) */
export const DEFAULT_REWARD_RULES = {
  pt_attendance: { score: 20, mile: 500 },
  steps_7000: { score: 10, mile: 300 },
  steps_10000: { score: 15, mile: 500 },
  steps_15000: { score: 20, mile: 700 },
  exercise_journal: { score: 5, mile: 100 },
  streak_7day: { score: 50, mile: 3000 },
  naver_review: { score: 0, mile: 2000 },
  referral_percent: 10,
} as const

export const MILE_EXPIRY_MONTHS = 12
export const REDEMPTION_MAX_PERCENT = 20
export const STEP_THRESHOLDS = [7000, 10000, 15000] as const
export const STREAK_DAYS = 7

export type RewardEventType =
  | 'pt_attendance'
  | 'steps_7000'
  | 'steps_10000'
  | 'steps_15000'
  | 'exercise_journal'
  | 'streak_7day'
  | 'naver_review'
  | 'referral_referrer'
  | 'referral_new_member'
  | 'redemption'
  | 'mile_expiry'
  | 'manual_adjust'

export const REWARD_EVENT_LABELS: Record<RewardEventType, string> = {
  pt_attendance: 'PT 출석',
  steps_7000: '7,000보 달성',
  steps_10000: '10,000보 달성',
  steps_15000: '15,000보 달성',
  exercise_journal: '운동일지 작성',
  streak_7day: '7일 연속 활동',
  naver_review: '네이버 리뷰',
  referral_referrer: '지인 소개 (소개자)',
  referral_new_member: '지인 소개 (신규 회원)',
  redemption: '재등록 결제 사용',
  mile_expiry: 'MILE 유효기간 만료',
  manual_adjust: '관리자 수동 조정',
}
