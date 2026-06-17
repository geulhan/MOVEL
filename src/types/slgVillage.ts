/** 운동나무 단계별 해금 건물 */
export const VILLAGE_UNLOCK_BY_STAGE: Record<string, string> = {
  seed: '건물 없음',
  sprout: '창고',
  small: '벤치',
  large: '광장',
  sakura: '분수',
}

export const VILLAGE_SLOT_LABELS: Record<string, string> = {
  north: '북쪽 슬롯',
  west: '서쪽 슬롯',
  east: '동쪽 슬롯',
  south: '남쪽 슬롯',
}

export type SlgBuildingCatalogItem = {
  id: string
  code: string
  title: string
  description: string
  tier: number
  build_cost_acorns: number
  upgrade_cost_acorns: number
  max_level: number
  sprite_key: string
  sort_order: number
  unlock_stage_key: string
  slot_key: string
  grid_x: number
  grid_y: number
  is_unlocked: boolean
}

export type SlgVillageSlot = {
  slot_key: string
  grid_x: number
  grid_y: number
  sort_order: number
  building_id: string
  code: string
  title: string
  description: string
  sprite_key: string
  tier: number
  build_cost_acorns: number
  upgrade_cost_acorns: number
  max_level: number
  unlock_stage_key: string
  is_unlocked: boolean
  slot_building_id: string | null
  level: number
  built_at: string | null
  is_built: boolean
  next_upgrade_cost: number | null
  build_cost_now: number | null
}

export type SlgVillageInfo = {
  id: string
  width: number
  height: number
  plaza_x: number
  plaza_y: number
}

export type SlgVillageState = {
  user_id: string
  member_id: string
  village: SlgVillageInfo
  current_acorns: number
  total_growth: number
  tree_stage_key: string
  tree_stage_name: string
  tree_stage_rank: number
  catalog: SlgBuildingCatalogItem[]
  slots: SlgVillageSlot[]
}

export const SLG_TIER_LABELS: Record<number, string> = {
  1: '기초',
  2: '성장',
  3: '확장',
  4: '랜드마크',
}

export const UNLOCK_STAGE_LABELS: Record<string, string> = {
  sprout: '새싹',
  small: '어린 나무',
  large: '큰 나무',
  sakura: '벚꽃나무',
}
