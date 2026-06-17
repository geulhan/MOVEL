export type SlgBuildingCatalogItem = {
  id: string
  code: string
  title: string
  description: string
  tier: number
  cost_acorns: number
  min_growth: number
  sprite_key: string
  sort_order: number
  is_unlocked: boolean
}

export type SlgVillageInventoryItem = {
  id: string
  building_id: string
  title: string
  code: string
  sprite_key: string
  tier: number
  quantity: number
}

export type SlgVillageBuilding = {
  id: string
  building_id: string
  code: string
  title: string
  sprite_key: string
  tier: number
  x: number
  y: number
  placed_at: string
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
  catalog: SlgBuildingCatalogItem[]
  inventory: SlgVillageInventoryItem[]
  buildings: SlgVillageBuilding[]
}

export const SLG_TIER_LABELS: Record<number, string> = {
  1: 'T1 기초',
  2: 'T2 성장',
  3: 'T3 훈련',
  4: 'T4 랜드마크',
}
