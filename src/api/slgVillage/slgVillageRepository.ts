import { supabase } from '../../lib/supabase'
import type { SlgVillageState } from '../../types/slgVillage'

function normalizeState(raw: Record<string, unknown>): SlgVillageState {
  const village = raw.village as Record<string, unknown> | undefined
  return {
    user_id: String(raw.user_id ?? ''),
    member_id: String(raw.member_id ?? ''),
    village: {
      id: String(village?.id ?? ''),
      width: Number(village?.width) || 8,
      height: Number(village?.height) || 8,
      plaza_x: Number(village?.plaza_x) || 3,
      plaza_y: Number(village?.plaza_y) || 3,
    },
    current_acorns: Number(raw.current_acorns) || 0,
    total_growth: Number(raw.total_growth) || 0,
    tree_stage_key: String(raw.tree_stage_key ?? 'seed'),
    tree_stage_name: String(raw.tree_stage_name ?? '씨앗'),
    catalog: Array.isArray(raw.catalog)
      ? raw.catalog.map((row) => {
          const item = row as Record<string, unknown>
          return {
            id: String(item.id ?? ''),
            code: String(item.code ?? ''),
            title: String(item.title ?? ''),
            description: String(item.description ?? ''),
            tier: Number(item.tier) || 1,
            cost_acorns: Number(item.cost_acorns) || 0,
            min_growth: Number(item.min_growth) || 0,
            sprite_key: String(item.sprite_key ?? ''),
            sort_order: Number(item.sort_order) || 0,
            is_unlocked: Boolean(item.is_unlocked),
          }
        })
      : [],
    inventory: Array.isArray(raw.inventory)
      ? raw.inventory.map((row) => {
          const item = row as Record<string, unknown>
          return {
            id: String(item.id ?? ''),
            building_id: String(item.building_id ?? ''),
            title: String(item.title ?? ''),
            code: String(item.code ?? ''),
            sprite_key: String(item.sprite_key ?? ''),
            tier: Number(item.tier) || 1,
            quantity: Number(item.quantity) || 0,
          }
        })
      : [],
    buildings: Array.isArray(raw.buildings)
      ? raw.buildings.map((row) => {
          const item = row as Record<string, unknown>
          return {
            id: String(item.id ?? ''),
            building_id: String(item.building_id ?? ''),
            code: String(item.code ?? ''),
            title: String(item.title ?? ''),
            sprite_key: String(item.sprite_key ?? ''),
            tier: Number(item.tier) || 1,
            x: Number(item.x) || 0,
            y: Number(item.y) || 0,
            placed_at: String(item.placed_at ?? ''),
          }
        })
      : [],
  }
}

export async function fetchSlgVillageStateRpc(memberId: string): Promise<SlgVillageState> {
  const { data, error } = await supabase.rpc('get_slg_village_state', {
    p_member_id: memberId,
  })
  if (error) throw error
  if (!data || typeof data !== 'object') {
    throw new Error('마을 정보를 불러올 수 없습니다.')
  }
  return normalizeState(data as Record<string, unknown>)
}

export async function purchaseSlgBuildingRpc(
  memberId: string,
  buildingId: string,
): Promise<SlgVillageState> {
  const { data, error } = await supabase.rpc('purchase_slg_building', {
    p_member_id: memberId,
    p_building_id: buildingId,
  })
  if (error) throw error
  return normalizeState(data as Record<string, unknown>)
}

export async function placeSlgBuildingRpc(
  memberId: string,
  buildingId: string,
  x: number,
  y: number,
): Promise<SlgVillageState> {
  const { data, error } = await supabase.rpc('place_slg_building', {
    p_member_id: memberId,
    p_building_id: buildingId,
    p_x: x,
    p_y: y,
  })
  if (error) throw error
  return normalizeState(data as Record<string, unknown>)
}

export async function moveSlgBuildingRpc(
  memberId: string,
  placementId: string,
  x: number,
  y: number,
): Promise<SlgVillageState> {
  const { data, error } = await supabase.rpc('move_slg_building', {
    p_member_id: memberId,
    p_placement_id: placementId,
    p_x: x,
    p_y: y,
  })
  if (error) throw error
  return normalizeState(data as Record<string, unknown>)
}

export async function retrieveSlgBuildingRpc(
  memberId: string,
  placementId: string,
): Promise<SlgVillageState> {
  const { data, error } = await supabase.rpc('retrieve_slg_building', {
    p_member_id: memberId,
    p_placement_id: placementId,
  })
  if (error) throw error
  return normalizeState(data as Record<string, unknown>)
}
