import { upsertCenterRewardSetting } from '../lib/rewardSettingsUpsert'
import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import {
  DEFAULT_CONTRACT_SETTINGS,
  type ContractSettings,
} from '../types/contractSettings'

const SETTING_KEY = 'contract_settings'

function clampDays(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(365, Math.round(n))
}

function normalizeSettings(raw: unknown): ContractSettings {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}

  return {
    ptRefundDaysPerSession: clampDays(
      row.ptRefundDaysPerSession,
      DEFAULT_CONTRACT_SETTINGS.ptRefundDaysPerSession,
    ),
  }
}

export async function fetchContractSettings(): Promise<ContractSettings> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('reward_settings')
    .select('setting_value')
    .eq('center_id', centerId)
    .eq('setting_key', SETTING_KEY)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const row = data?.[0]
  if (!row?.setting_value) return { ...DEFAULT_CONTRACT_SETTINGS }
  return normalizeSettings(row.setting_value)
}

export async function saveContractSettings(
  settings: ContractSettings,
): Promise<ContractSettings> {
  const payload = normalizeSettings(settings)

  await upsertCenterRewardSetting({
    settingKey: SETTING_KEY,
    settingValue: payload as unknown as Json,
  })

  return payload
}
