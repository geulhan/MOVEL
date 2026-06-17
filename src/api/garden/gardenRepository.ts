import { supabase } from '../../lib/supabase'
import type { GardenState } from '../../types/garden'

type RpcGardenState = GardenState & { ok?: boolean }

function normalizeGardenState(raw: RpcGardenState): GardenState {
  return {
    user_id: String(raw.user_id ?? ''),
    member_id: String(raw.member_id ?? ''),
    garden: {
      id: String(raw.garden?.id ?? ''),
      width: Number(raw.garden?.width) || 6,
      height: Number(raw.garden?.height) || 6,
      tree_x: Number(raw.garden?.tree_x) || 2,
      tree_y: Number(raw.garden?.tree_y) || 2,
    },
    current_acorns: Number(raw.current_acorns) || 0,
    tree_stage_key: String(raw.tree_stage_key ?? 'seed'),
    tree_stage_name: String(raw.tree_stage_name ?? '씨앗'),
    shop_items: Array.isArray(raw.shop_items)
      ? raw.shop_items.map((row) => {
          const item = row as Record<string, unknown>
          return {
            id: String(item.id ?? ''),
            item_name: String(item.item_name ?? ''),
            item_type: String(item.item_type ?? ''),
            cost_acorns: Number(item.cost_acorns) || 0,
            sprite_key: String(item.sprite_key ?? ''),
            sort_order: Number(item.sort_order) || 0,
          }
        })
      : [],
    inventory: Array.isArray(raw.inventory)
      ? raw.inventory.map((row) => {
          const item = row as Record<string, unknown>
          return {
            id: String(item.id ?? ''),
            shop_item_id: String(item.shop_item_id ?? ''),
            item_name: String(item.item_name ?? ''),
            item_type: String(item.item_type ?? ''),
            sprite_key: String(item.sprite_key ?? ''),
            quantity: Number(item.quantity) || 0,
          }
        })
      : [],
    placed_items: Array.isArray(raw.placed_items)
      ? raw.placed_items.map((row) => {
          const item = row as Record<string, unknown>
          return {
            id: String(item.id ?? ''),
            shop_item_id: String(item.shop_item_id ?? ''),
            item_name: String(item.item_name ?? ''),
            item_type: String(item.item_type ?? ''),
            sprite_key: String(item.sprite_key ?? ''),
            x: Number(item.x) || 0,
            y: Number(item.y) || 0,
            placed_at: String(item.placed_at ?? ''),
          }
        })
      : [],
  }
}

export async function fetchGardenStateRpc(memberId: string): Promise<GardenState> {
  const { data, error } = await supabase.rpc('get_garden_state', {
    p_member_id: memberId,
  })

  if (error) throw error
  if (!data || typeof data !== 'object') {
    throw new Error('정원 정보를 불러올 수 없습니다.')
  }

  const raw = data as RpcGardenState
  if (raw.ok === false) {
    throw new Error('정원 정보를 불러올 수 없습니다.')
  }

  return normalizeGardenState(raw)
}

export async function purchaseGardenItemRpc(
  memberId: string,
  shopItemId: string,
): Promise<GardenState> {
  const { data, error } = await supabase.rpc('purchase_garden_shop_item', {
    p_member_id: memberId,
    p_shop_item_id: shopItemId,
  })
  if (error) throw error
  return normalizeGardenState(data as RpcGardenState)
}

export async function placeGardenItemRpc(
  memberId: string,
  shopItemId: string,
  x: number,
  y: number,
): Promise<GardenState> {
  const { data, error } = await supabase.rpc('place_garden_item', {
    p_member_id: memberId,
    p_shop_item_id: shopItemId,
    p_x: x,
    p_y: y,
  })
  if (error) throw error
  return normalizeGardenState(data as RpcGardenState)
}

export async function moveGardenItemRpc(
  memberId: string,
  placementId: string,
  x: number,
  y: number,
): Promise<GardenState> {
  const { data, error } = await supabase.rpc('move_garden_item', {
    p_member_id: memberId,
    p_placement_id: placementId,
    p_x: x,
    p_y: y,
  })
  if (error) throw error
  return normalizeGardenState(data as RpcGardenState)
}

export async function retrieveGardenItemRpc(
  memberId: string,
  placementId: string,
): Promise<GardenState> {
  const { data, error } = await supabase.rpc('retrieve_garden_item', {
    p_member_id: memberId,
    p_placement_id: placementId,
  })
  if (error) throw error
  return normalizeGardenState(data as RpcGardenState)
}
