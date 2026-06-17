import type { ActiveCenterChallenge } from './challenges'

export type GrowthEventType =
  | 'PT_ATTENDANCE'
  | 'GROUP_CLASS_ATTENDANCE'
  | 'WORKOUT_LOG'
  | 'PHOTO_WORKOUT_LOG'
  | 'BODY_COMPOSITION'
  | 'CHALLENGE_COMPLETE'
  | 'CHALLENGE'
  | 'STREAK_7_DAYS'
  | 'STREAK_30_DAYS'
  | 'STEPS_3000'
  | 'STEPS_5000'
  | 'STEPS_7000'
  | 'STEPS_10000'
  | 'STEPS_15000'
  | 'MANUAL'

export type GrowthTreeStageKey =
  | 'none'
  | 'seed'
  | 'sprout'
  | 'small'
  | 'large'
  | 'sakura'

export type GrowthRewardRule = {
  event_type: GrowthEventType | string
  display_name_ko: string
  growth_reward: number
  acorn_reward: number
  limit_period: 'none' | 'monthly' | 'rolling_30d'
  limit_count: number | null
}

export type GrowthTreeStageRow = {
  stage_key: GrowthTreeStageKey | string
  sort_order: number
  min_growth: number
  display_name_ko: string
}

export type GrowthTreeInfo = {
  current_stage_key: GrowthTreeStageKey
  current_stage_name: string
  current_min_growth: number
  next_stage_key: GrowthTreeStageKey | null
  next_stage_name: string | null
  next_min_growth: number | null
  growth_until_next: number
  is_max_stage: boolean
}

export type GrowthActivityRow = {
  id: string
  event_type: GrowthEventType | string
  title_ko?: string
  growth_amount: number
  acorn_amount?: number
  source: string | null
  created_at: string
}

export type GrowthTimelineItem = {
  id: string
  kind: 'activity' | 'achievement' | 'tree_stage' | string
  title: string
  subtitle: string | null
  icon: string | null
  growth_amount: number
  acorn_amount: number
  created_at: string
}

export type GrowthNotification = {
  id: string
  notification_type: 'achievement' | 'tree_stage' | string
  title: string
  body: string | null
  icon: string
  growth_amount: number
  acorn_amount: number
  is_read: boolean
  created_at: string
}

export type GrowthAchievement = {
  id: string
  code: string
  title: string
  description: string
  icon: string
  metric_type: string
  target_value: number
  reward_growth: number
  reward_acorn: number
  sort_order: number
  current_value: number
  is_unlocked: boolean
  unlocked_at: string | null
}

export type GrowthFeedItem = {
  id: string
  event_type: GrowthEventType | string
  event_key?: string
  title_ko: string
  growth_amount: number
  acorn_amount: number
  source: string | null
  created_at: string
}

export type GrowthProfile = {
  user_id: string
  member_id: string
  total_growth: number
  current_acorns: number
  current_mile: number
  current_stage_key: GrowthTreeStageKey
  current_stage_name: string
  next_stage_key: GrowthTreeStageKey | null
  next_stage_name: string | null
  growth_until_next: number
  is_max_stage: boolean
  tree: GrowthTreeInfo
  growth_feed: GrowthFeedItem[]
  recent_growth: GrowthActivityRow[]
  growth_timeline: GrowthTimelineItem[]
  growth_notifications: GrowthNotification[]
  unread_notification_count: number
  achievements: GrowthAchievement[]
  active_challenges: ActiveCenterChallenge[]
  reward_rules: GrowthRewardRule[]
  tree_stages: GrowthTreeStageRow[]
}

export type PostGrowthEventResult = {
  ok: boolean
  duplicate: boolean
  limit_reached?: boolean
  user_id: string
  member_id?: string
  event_type?: string
  event_key?: string
  feed_id?: string
  title_ko?: string
  growth_awarded?: number
  acorns_awarded?: number
  total_growth: number
  current_acorns: number
  tree: GrowthTreeInfo
}

export const GROWTH_EVENT_LABELS: Record<string, string> = {
  PT_ATTENDANCE: 'PT 출석',
  GROUP_CLASS_ATTENDANCE: '그룹수업 출석',
  WORKOUT_LOG: '운동일지 작성',
  PHOTO_WORKOUT_LOG: '사진 포함 운동일지',
  BODY_COMPOSITION: '체성분 측정',
  CHALLENGE_COMPLETE: '센터 챌린지 완료',
  CHALLENGE: '센터 챌린지 완료',
  STREAK_7_DAYS: '7일 연속 출석',
  STREAK_30_DAYS: '30일 연속 출석',
  MANUAL: '관리자 지급',
}

export const GROWTH_TREE_EMOJI: Record<GrowthTreeStageKey, string> = {
  none: '🪴',
  seed: '🌱',
  sprout: '🌿',
  small: '🌳',
  large: '🌲',
  sakura: '🌸',
}

/** DB 미적용 시 UI 폴백용 기본 보상 규칙 */
export const DEFAULT_GROWTH_REWARD_RULES: GrowthRewardRule[] = [
  {
    event_type: 'PT_ATTENDANCE',
    display_name_ko: 'PT 출석',
    growth_reward: 30,
    acorn_reward: 1,
    limit_period: 'none',
    limit_count: null,
  },
  {
    event_type: 'GROUP_CLASS_ATTENDANCE',
    display_name_ko: '그룹수업 출석',
    growth_reward: 20,
    acorn_reward: 1,
    limit_period: 'none',
    limit_count: null,
  },
  {
    event_type: 'WORKOUT_LOG',
    display_name_ko: '운동일지 작성',
    growth_reward: 10,
    acorn_reward: 1,
    limit_period: 'none',
    limit_count: null,
  },
  {
    event_type: 'PHOTO_WORKOUT_LOG',
    display_name_ko: '사진 포함 운동일지',
    growth_reward: 15,
    acorn_reward: 1,
    limit_period: 'none',
    limit_count: null,
  },
  {
    event_type: 'BODY_COMPOSITION',
    display_name_ko: '체성분 측정',
    growth_reward: 50,
    acorn_reward: 3,
    limit_period: 'rolling_30d',
    limit_count: 1,
  },
  {
    event_type: 'CHALLENGE_COMPLETE',
    display_name_ko: '센터 챌린지 완료',
    growth_reward: 100,
    acorn_reward: 5,
    limit_period: 'none',
    limit_count: null,
  },
  {
    event_type: 'STREAK_7_DAYS',
    display_name_ko: '7일 연속 출석',
    growth_reward: 150,
    acorn_reward: 10,
    limit_period: 'none',
    limit_count: null,
  },
  {
    event_type: 'STREAK_30_DAYS',
    display_name_ko: '30일 연속 출석',
    growth_reward: 500,
    acorn_reward: 30,
    limit_period: 'none',
    limit_count: null,
  },
]
