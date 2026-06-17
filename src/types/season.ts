export type SeasonRewardType = 'acorns' | 'garden_item' | 'limited_item'

export type Season = {
  id: string
  center_id: string
  title: string
  description: string
  start_date: string
  end_date: string
  max_level: number
  is_active: boolean
  created_at: string
}

export type SeasonReward = {
  id: string
  level: number
  xp_required: number
  reward_type: SeasonRewardType | string
  reward_acorns: number
  garden_shop_item_id: string | null
  title: string
  description: string
  icon: string
  sprite_key: string | null
  is_unlocked: boolean
  is_claimed: boolean
}

export type SeasonXpRule = {
  event_type: string
  display_name_ko: string
  xp_amount: number
}

export type SeasonPassState = {
  has_active_season: boolean
  member_id: string
  user_id?: string
  season?: {
    id: string
    title: string
    description: string
    start_date: string
    end_date: string
    max_level: number
  }
  progress?: {
    season_xp: number
    current_level: number
    next_reward: {
      id: string
      level: number
      xp_required: number
      title: string
      description: string
      icon: string
    } | null
  }
  rewards: SeasonReward[]
  xp_rules: SeasonXpRule[]
}

export type CreateSeasonInput = {
  title: string
  description?: string
  start_date: string
  end_date: string
  is_active?: boolean
}
