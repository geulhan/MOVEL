import {
  DEFAULT_PT_PRICING,
  type PtPackage,
  type PtPricingConfig,
} from '../constants/pricing'
import {
  PAYMENT_CATEGORY_LABELS,
  pricingSettingKey,
  type SessionPaymentCategory,
} from '../constants/paymentCategories'
import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'

function normalizePackage(
  raw: unknown,
  index: number,
  fallbackLabel: string,
): PtPackage | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const sessions = Number(row.sessions)
  const amount = Number(row.amount)
  if (!Number.isInteger(sessions) || sessions < 1) return null
  if (!Number.isFinite(amount) || amount < 0) return null

  return {
    id: String(row.id ?? `pkg_${index + 1}`),
    label: String(row.label ?? `${fallbackLabel} ${sessions}회`),
    sessions,
    amount: Math.round(amount),
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? index + 1),
  }
}

function normalizePricing(
  value: unknown,
  category: SessionPaymentCategory,
): PtPricingConfig {
  const fallbackLabel = PAYMENT_CATEGORY_LABELS[category]
  const packagesRaw =
    value && typeof value === 'object' && 'packages' in value
      ? (value as { packages?: unknown }).packages
      : null

  const packages = Array.isArray(packagesRaw)
    ? packagesRaw
        .map((item, index) => normalizePackage(item, index, fallbackLabel))
        .filter((item): item is PtPackage => item !== null)
        .sort((a, b) => a.sort_order - b.sort_order)
    : []

  if (packages.length > 0) return { packages }
  return category === 'pt' ? DEFAULT_PT_PRICING : { packages: [] }
}

async function readPricingRow(
  centerId: string,
  settingKey: string,
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('reward_settings')
    .select('setting_value')
    .eq('center_id', centerId)
    .eq('setting_key', settingKey)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) throw error
  if (data?.[0]?.setting_value) return data[0].setting_value

  if (settingKey !== 'pt_pricing') return null

  const { data: legacy, error: legacyError } = await supabase
    .from('reward_settings')
    .select('setting_value')
    .eq('setting_key', 'pt_pricing')
    .is('branch_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (legacyError) throw legacyError
  return legacy?.[0]?.setting_value ?? null
}

export async function fetchSessionPassPricing(
  category: SessionPaymentCategory,
): Promise<PtPricingConfig> {
  const centerId = await getCurrentCenterId()
  const value = await readPricingRow(centerId, pricingSettingKey(category))
  if (!value) {
    return category === 'pt' ? DEFAULT_PT_PRICING : { packages: [] }
  }
  return normalizePricing(value, category)
}

export async function fetchPtPricing(): Promise<PtPricingConfig> {
  return fetchSessionPassPricing('pt')
}

export async function saveSessionPassPricing(
  category: SessionPaymentCategory,
  config: PtPricingConfig,
): Promise<void> {
  const centerId = await getCurrentCenterId()
  const settingKey = pricingSettingKey(category)
  const label = PAYMENT_CATEGORY_LABELS[category]

  const packages = config.packages
    .map((pkg, index) => ({
      ...pkg,
      id: pkg.id.trim() || `pkg_${index + 1}`,
      label: pkg.label.trim() || `${label} ${pkg.sessions}회`,
      sessions: Math.max(1, Math.round(pkg.sessions)),
      amount: Math.max(0, Math.round(pkg.amount)),
      sort_order: index + 1,
    }))
    .filter((pkg) => pkg.label.length > 0)

  if (packages.length === 0) {
    throw new Error('최소 1개의 패키지가 필요합니다.')
  }

  const payload = {
    setting_value: { packages } as const,
    description: `${label} 기본 가격`,
    updated_at: new Date().toISOString(),
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from('reward_settings')
    .select('id')
    .eq('center_id', centerId)
    .eq('setting_key', settingKey)
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
    setting_key: settingKey,
    setting_value: payload.setting_value,
    description: payload.description,
  })

  if (error) throw error
}

export async function savePtPricing(config: PtPricingConfig): Promise<void> {
  return saveSessionPassPricing('pt', config)
}

export function getActivePackages(config: PtPricingConfig): PtPackage[] {
  return config.packages.filter((pkg) => pkg.is_active)
}

export function findPackageById(
  config: PtPricingConfig,
  packageId: string,
): PtPackage | undefined {
  return config.packages.find((pkg) => pkg.id === packageId)
}
