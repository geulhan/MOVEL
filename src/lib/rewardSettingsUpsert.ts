import { getCurrentCenterId } from './center'
import { supabase } from './supabase'
import type { Json } from '../types/database'

type UpsertCenterRewardSettingInput = {
  settingKey: string
  settingValue: Json
  description?: string | null
}

/**
 * 센터별 reward_settings 저장.
 * branch_id = center_id 로 넣어 전역 unique index(reward_settings_global_key_uidx) 충돌을 피합니다.
 */
export async function upsertCenterRewardSetting(
  input: UpsertCenterRewardSettingInput,
): Promise<void> {
  const centerId = await getCurrentCenterId()
  const payload = {
    setting_value: input.settingValue,
    description: input.description ?? null,
    updated_at: new Date().toISOString(),
    branch_id: centerId,
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from('reward_settings')
    .select('id')
    .eq('center_id', centerId)
    .eq('setting_key', input.settingKey)
    .order('updated_at', { ascending: false })

  if (fetchError) throw fetchError

  const primary = existingRows?.[0]
  if (primary) {
    const { error } = await supabase
      .from('reward_settings')
      .update(payload)
      .eq('id', primary.id)
    if (error) throw error

    const duplicateIds = (existingRows ?? []).slice(1).map((row) => row.id)
    if (duplicateIds.length > 0) {
      await supabase.from('reward_settings').delete().in('id', duplicateIds)
    }
    return
  }

  const { error } = await supabase.from('reward_settings').insert({
    center_id: centerId,
    branch_id: centerId,
    setting_key: input.settingKey,
    setting_value: input.settingValue,
    description: input.description ?? null,
  })

  if (error) throw error
}
