import { supabase } from '../../lib/supabase'
import type { SlgVillageState } from '../../types/slgVillage'

function normalizeSlot(row: Record<string, unknown>) {
  return {
    slot_key: String(row.slot_key ?? ''),
    grid_x: Number(row.grid_x) || 0,
    grid_y: Number(row.grid_y) || 0,
    sort_order: Number(row.sort_order) || 0,
    building_id: String(row.building_id ?? ''),
    code: String(row.code ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    sprite_key: String(row.sprite_key ?? ''),
    tier: Number(row.tier) || 1,
    build_cost_acorns: Number(row.build_cost_acorns) || 0,
    upgrade_cost_acorns: Number(row.upgrade_cost_acorns) || 0,
    max_level: Number(row.max_level) || 3,
    unlock_stage_key: String(row.unlock_stage_key ?? ''),
    is_unlocked: Boolean(row.is_unlocked),
    slot_building_id:
      row.slot_building_id != null ? String(row.slot_building_id) : null,
    level: Number(row.level) || 0,
    built_at: row.built_at != null ? String(row.built_at) : null,
    is_built: Boolean(row.is_built),
    next_upgrade_cost:
      row.next_upgrade_cost != null ? Number(row.next_upgrade_cost) : null,
    build_cost_now:
      row.build_cost_now != null ? Number(row.build_cost_now) : null,
  }
}

function normalizeState(raw: Record<string, unknown>): SlgVillageState {
  const village = raw.village as Record<string, unknown> | undefined
  return {
    user_id: String(raw.user_id ?? ''),
    member_id: String(raw.member_id ?? ''),
    village: {
      id: String(village?.id ?? ''),
      width: Number(village?.width) || 5,
      height: Number(village?.height) || 5,
      plaza_x: Number(village?.plaza_x) || 2,
      plaza_y: Number(village?.plaza_y) || 2,
    },
    current_acorns: Number(raw.current_acorns) || 0,
    total_growth: Number(raw.total_growth) || 0,
    tree_stage_key: String(raw.tree_stage_key ?? 'seed'),
    tree_stage_name: String(raw.tree_stage_name ?? '씨앗'),
    tree_stage_rank: Number(raw.tree_stage_rank) || 0,
    catalog: Array.isArray(raw.catalog)
      ? raw.catalog.map((row) => {
          const item = row as Record<string, unknown>
          return {
            id: String(item.id ?? ''),
            code: String(item.code ?? ''),
            title: String(item.title ?? ''),
            description: String(item.description ?? ''),
            tier: Number(item.tier) || 1,
            build_cost_acorns: Number(item.build_cost_acorns) || 0,
            upgrade_cost_acorns: Number(item.upgrade_cost_acorns) || 0,
            max_level: Number(item.max_level) || 3,
            sprite_key: String(item.sprite_key ?? ''),
            sort_order: Number(item.sort_order) || 0,
            unlock_stage_key: String(item.unlock_stage_key ?? ''),
            slot_key: String(item.slot_key ?? ''),
            grid_x: Number(item.grid_x) || 0,
            grid_y: Number(item.grid_y) || 0,
            is_unlocked: Boolean(item.is_unlocked),
          }
        })
      : [],
    slots: Array.isArray(raw.slots)
      ? raw.slots.map((row) => normalizeSlot(row as Record<string, unknown>))
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

export async function buildSlgVillageSlotRpc(
  memberId: string,
  slotKey: string,
): Promise<SlgVillageState> {
  const { data, error } = await supabase.rpc('build_slg_village_slot', {
    p_member_id: memberId,
    p_slot_key: slotKey,
  })
  if (error) throw error
  return normalizeState(data as Record<string, unknown>)
}

export async function upgradeSlgVillageSlotRpc(
  memberId: string,
  slotKey: string,
): Promise<SlgVillageState> {
  const { data, error } = await supabase.rpc('upgrade_slg_village_slot', {
    p_member_id: memberId,
    p_slot_key: slotKey,
  })
  if (error) throw error
  return normalizeState(data as Record<string, unknown>)
}
