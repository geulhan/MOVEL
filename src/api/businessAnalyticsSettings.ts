import { upsertCenterRewardSetting } from '../lib/rewardSettingsUpsert'
import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import {
  DEFAULT_BUSINESS_ANALYTICS_SETTINGS,
  type BusinessAnalyticsSettings,
  type FixedCosts,
} from '../types/businessAnalytics'

const SETTING_KEY = 'business_analytics'

function clampPercent(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(100, Math.max(0, n))
}

function clampMoney(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n)
}

function normalizeFixedCosts(raw: unknown): FixedCosts {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return {
    rent: clampMoney(row.rent),
    maintenance: clampMoney(row.maintenance),
    cardFee: clampMoney(row.cardFee),
    telecom: clampMoney(row.telecom),
    other: clampMoney(row.other),
  }
}

function normalizeSettings(raw: unknown): BusinessAnalyticsSettings {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}

  return {
    trainerSettlementRate: clampPercent(
      row.trainerSettlementRate,
      DEFAULT_BUSINESS_ANALYTICS_SETTINGS.trainerSettlementRate,
    ),
    ownerTrainerId:
      row.ownerTrainerId != null && String(row.ownerTrainerId).trim()
        ? String(row.ownerTrainerId)
        : null,
    fixedCosts: normalizeFixedCosts(row.fixedCosts),
    taxReserveRate: clampPercent(
      row.taxReserveRate,
      DEFAULT_BUSINESS_ANALYTICS_SETTINGS.taxReserveRate,
    ),
    facilityReserveRate: clampPercent(
      row.facilityReserveRate,
      DEFAULT_BUSINESS_ANALYTICS_SETTINGS.facilityReserveRate,
    ),
  }
}

export async function fetchBusinessAnalyticsSettings(): Promise<BusinessAnalyticsSettings> {
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
  if (!row?.setting_value) return { ...DEFAULT_BUSINESS_ANALYTICS_SETTINGS }
  return normalizeSettings(row.setting_value)
}

export async function saveBusinessAnalyticsSettings(
  settings: BusinessAnalyticsSettings,
): Promise<void> {
  const payload = normalizeSettings(settings)

  await upsertCenterRewardSetting({
    settingKey: SETTING_KEY,
    settingValue: payload as unknown as Json,
  })
}

export function sumFixedCosts(costs: FixedCosts): number {
  return (
    costs.rent +
    costs.maintenance +
    costs.cardFee +
    costs.telecom +
    costs.other
  )
}
