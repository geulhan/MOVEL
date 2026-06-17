export type GrowthEventType =
  | 'PT_ATTENDANCE'
  | 'WORKOUT_LOG'
  | 'CHALLENGE'
  | 'MANUAL'

export type GrowthTreeStageKey =
  | 'none'
  | 'seed'
  | 'sprout'
  | 'small'
  | 'large'
  | 'sakura'

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
  growth_amount: number
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
  recent_growth: GrowthActivityRow[]
}

export type PostGrowthEventResult = {
  ok: boolean
  duplicate: boolean
  user_id: string
  growth_awarded?: number
  acorns_awarded?: number
  total_growth: number
  current_acorns: number
  tree: GrowthTreeInfo
}

export const GROWTH_EVENT_LABELS: Record<string, string> = {
  PT_ATTENDANCE: 'PT 출석',
  WORKOUT_LOG: '운동일지 작성',
  CHALLENGE: '센터 챌린지 완료',
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
