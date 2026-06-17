export type CenterChallengeType =
  | 'ATTENDANCE'
  | 'WORKOUT_LOG'
  | 'PT_SESSION'
  | 'BODY_COMPOSITION'
  | 'CUSTOM'

export type CenterChallenge = {
  id: string
  center_id: string
  title: string
  description: string
  challenge_type: CenterChallengeType
  target_value: number
  reward_growth: number
  reward_acorn: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export type UserChallengeProgress = {
  id: string
  user_id: string
  challenge_id: string
  current_value: number
  target_value: number
  completed_at: string | null
  reward_claimed: boolean
  created_at: string
  updated_at: string
}

export type ActiveCenterChallenge = {
  id: string
  title: string
  description: string
  challenge_type: CenterChallengeType
  target_value: number
  reward_growth: number
  reward_acorn: number
  start_date: string
  end_date: string
  current_value: number
  progress_target: number
  completed_at: string | null
  reward_claimed: boolean
  is_completed: boolean
}

export type CreateCenterChallengeInput = {
  title: string
  description?: string
  challenge_type: CenterChallengeType
  target_value: number
  reward_growth: number
  reward_acorn: number
  start_date: string
  end_date: string
  is_active?: boolean
}

export const CHALLENGE_TYPE_LABELS: Record<CenterChallengeType, string> = {
  ATTENDANCE: '출석',
  WORKOUT_LOG: '운동일지',
  PT_SESSION: 'PT 세션 완료',
  BODY_COMPOSITION: '체성분 측정',
  CUSTOM: '커스텀',
}

export type ChallengeTemplate = {
  key: string
  label: string
  challenge_type: CenterChallengeType
  title: string
  description: string
  target_value: number
  reward_growth: number
  reward_acorn: number
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    key: 'attendance_12',
    label: '이번 달 12회 출석',
    challenge_type: 'ATTENDANCE',
    title: '12회 출석 챌린지',
    description: 'PT·그룹수업 출석을 12회 달성하세요.',
    target_value: 12,
    reward_growth: 300,
    reward_acorn: 30,
  },
  {
    key: 'workout_log_10',
    label: '운동일지 10회 작성',
    challenge_type: 'WORKOUT_LOG',
    title: '운동일지 10회 챌린지',
    description: '운동일지를 10회 작성하세요.',
    target_value: 10,
    reward_growth: 150,
    reward_acorn: 15,
  },
  {
    key: 'pt_session_8',
    label: 'PT 세션 8회 완료',
    challenge_type: 'PT_SESSION',
    title: 'PT 8회 완료 챌린지',
    description: 'PT 세션을 8회 완료하세요.',
    target_value: 8,
    reward_growth: 250,
    reward_acorn: 25,
  },
]
