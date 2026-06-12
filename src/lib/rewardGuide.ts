import {
  DEFAULT_REWARD_RULES,
  MILE_EXPIRY_MONTHS,
  REDEMPTION_MAX_PERCENT,
  REWARD_EVENT_LABELS,
  REWARD_TIER_LABELS,
  STEP_REWARD_TIERS,
  STREAK_DAYS,
  TIER_THRESHOLDS,
} from '../constants/rewards'

type EarnRules = typeof DEFAULT_REWARD_RULES

export type MemberRewardGuideRow = {
  key: string
  title: string
  description: string
  score: string
  mile: string
}

export type MemberRewardGuide = {
  earnRows: MemberRewardGuideRow[]
  tierRows: Array<{ tier: string; range: string }>
  notes: string[]
}

function formatRewardAmount(value: number, suffix: string): string {
  return `+${value.toLocaleString()}${suffix}`
}

export function buildMemberRewardGuide(
  rules: EarnRules,
  redemptionMaxPercent = REDEMPTION_MAX_PERCENT,
): MemberRewardGuide {
  const earnRows: MemberRewardGuideRow[] = [
    ...STEP_REWARD_TIERS.map((tier) => {
      const rule = rules[tier.key]
      return {
        key: tier.key,
        title: REWARD_EVENT_LABELS[tier.key],
        description: `매일 건강앱 캡처 인증 · ${tier.min.toLocaleString()}보 이상 (구간별 1일 1회)`,
        score: formatRewardAmount(rule.score, '점'),
        mile: formatRewardAmount(rule.mile, 'M'),
      }
    }),
    {
      key: 'pt_attendance',
      title: REWARD_EVENT_LABELS.pt_attendance,
      description: 'PT 수업 출석 시',
      score: formatRewardAmount(rules.pt_attendance.score, '점'),
      mile: formatRewardAmount(rules.pt_attendance.mile, 'M'),
    },
    {
      key: 'exercise_journal',
      title: REWARD_EVENT_LABELS.exercise_journal,
      description: '운동일지 작성 시',
      score: formatRewardAmount(rules.exercise_journal.score, '점'),
      mile: formatRewardAmount(rules.exercise_journal.mile, 'M'),
    },
    {
      key: 'streak_7day',
      title: REWARD_EVENT_LABELS.streak_7day,
      description: `${STREAK_DAYS}일 연속 활동 달성 시`,
      score: formatRewardAmount(rules.streak_7day.score, '점'),
      mile: formatRewardAmount(rules.streak_7day.mile, 'M'),
    },
    {
      key: 'center_photo',
      title: REWARD_EVENT_LABELS.center_photo,
      description: '센터에서 카메라로 촬영 · 관리자 검수 후 적립 · 하루 1회',
      score: formatRewardAmount(rules.center_photo.score, '점'),
      mile: formatRewardAmount(rules.center_photo.mile, 'M'),
    },
    {
      key: 'naver_review',
      title: REWARD_EVENT_LABELS.naver_review,
      description: '네이버 리뷰 작성 시 (센터 확인 후)',
      score: '-',
      mile: formatRewardAmount(rules.naver_review.mile, 'M'),
    },
    {
      key: 'referral',
      title: '지인 소개',
      description: `소개 회원 결제 시 결제금액의 ${rules.referral_percent}% MILE (소개자·신규 회원)`,
      score: '-',
      mile: `${rules.referral_percent}%`,
    },
  ]

  const tierRows = TIER_THRESHOLDS.map((row) => ({
    tier: REWARD_TIER_LABELS[row.tier],
    range:
      row.max === Infinity
        ? `${row.min.toLocaleString()}점 이상`
        : `${row.min.toLocaleString()} ~ ${row.max.toLocaleString()}점`,
  }))

  const notes = [
    `MOVE SCORE는 누적 등급(BRONZE → MOVEL ELITE)에만 사용되며 현금 가치가 없습니다.`,
    `MOVE MILE은 재등록 결제 시 사용 가능 (결제금액의 최대 ${redemptionMaxPercent}%, 1M = 1원).`,
    `MILE 유효기간은 적립일 기준 ${MILE_EXPIRY_MONTHS}개월입니다.`,
    `걸음 인증은 하루 1회이며, 7,000보 미만은 반려됩니다.`,
  ]

  return { earnRows, tierRows, notes }
}

export { DEFAULT_REWARD_RULES }
