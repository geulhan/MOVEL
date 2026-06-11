import {
  DEFAULT_PT_PRICING,
  type PtPackage,
  type PtPricingConfig,
} from '../constants/pricing'
import { supabase } from '../lib/supabase'

function normalizePackage(raw: unknown, index: number): PtPackage | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const sessions = Number(row.sessions)
  const amount = Number(row.amount)
  if (!Number.isInteger(sessions) || sessions < 1) return null
  if (!Number.isFinite(amount) || amount < 0) return null

  return {
    id: String(row.id ?? `pkg_${index + 1}`),
    label: String(row.label ?? `PT ${sessions}회`),
    sessions,
    amount: Math.round(amount),
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? index + 1),
  }
}

function normalizePricing(value: unknown): PtPricingConfig {
  const packagesRaw =
    value && typeof value === 'object' && 'packages' in value
      ? (value as { packages?: unknown }).packages
      : null

  const packages = Array.isArray(packagesRaw)
    ? packagesRaw
        .map((item, index) => normalizePackage(item, index))
        .filter((item): item is PtPackage => item !== null)
        .sort((a, b) => a.sort_order - b.sort_order)
    : []

  return {
    packages: packages.length > 0 ? packages : DEFAULT_PT_PRICING.packages,
  }
}

export async function fetchPtPricing(): Promise<PtPricingConfig> {
  const { data, error } = await supabase
    .from('reward_settings')
    .select('setting_value')
    .eq('setting_key', 'pt_pricing')
    .is('branch_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const row = data?.[0]
  if (!row?.setting_value) return DEFAULT_PT_PRICING
  return normalizePricing(row.setting_value)
}

export async function savePtPricing(config: PtPricingConfig): Promise<void> {
  const packages = config.packages
    .map((pkg, index) => ({
      ...pkg,
      id: pkg.id.trim() || `pkg_${index + 1}`,
      label: pkg.label.trim() || `PT ${pkg.sessions}회`,
      sessions: Math.max(1, Math.round(pkg.sessions)),
      amount: Math.max(0, Math.round(pkg.amount)),
      sort_order: index + 1,
    }))
    .filter((pkg) => pkg.label.length > 0)

  if (packages.length === 0) {
    throw new Error('최소 1개의 PT 패키지가 필요합니다.')
  }

  const payload = {
    setting_value: { packages } as const,
    description: 'PT 회원권 기본 가격',
    updated_at: new Date().toISOString(),
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from('reward_settings')
    .select('id')
    .eq('setting_key', 'pt_pricing')
    .is('branch_id', null)
    .order('updated_at', { ascending: false })

  if (fetchError) throw fetchError

  const primary = existingRows?.[0]
  if (primary) {
    const { error } = await supabase
      .from('reward_settings')
      .update(payload)
      .eq('id', primary.id)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('reward_settings').insert({
    branch_id: null,
    setting_key: 'pt_pricing',
    setting_value: payload.setting_value,
    description: payload.description,
  })

  if (error) throw error
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
