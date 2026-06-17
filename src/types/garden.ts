export type GardenItemType =
  | 'flower'
  | 'bench'
  | 'street_lamp'
  | 'stone_path'
  | 'pond'

export type GardenShopItem = {
  id: string
  item_name: string
  item_type: GardenItemType | string
  cost_acorns: number
  sprite_key: string
  sort_order: number
}

export type GardenInventoryItem = {
  id: string
  shop_item_id: string
  item_name: string
  item_type: string
  sprite_key: string
  quantity: number
}

export type GardenPlacedItem = {
  id: string
  shop_item_id: string
  item_name: string
  item_type: string
  sprite_key: string
  x: number
  y: number
  placed_at: string
}

export type GardenInfo = {
  id: string
  width: number
  height: number
  tree_x: number
  tree_y: number
}

export type GardenState = {
  user_id: string
  member_id: string
  garden: GardenInfo
  current_acorns: number
  tree_stage_key: string
  tree_stage_name: string
  shop_items: GardenShopItem[]
  inventory: GardenInventoryItem[]
  placed_items: GardenPlacedItem[]
}

export const GARDEN_ITEM_LABELS: Record<string, string> = {
  flower: '꽃',
  bench: '벤치',
  street_lamp: '가로등',
  stone_path: '돌길',
  pond: '작은 연못',
}

export const TREE_SPRITE_BY_STAGE: Record<string, string> = {
  none: 'tree_seed',
  seed: 'tree_seed',
  sprout: 'tree_sprout',
  small: 'tree_small',
  large: 'tree_large',
  sakura: 'tree_sakura',
}
