import { upsertCenterRewardSetting } from '../lib/rewardSettingsUpsert'
import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import {
  DEFAULT_PAYMENT_CATEGORY_FLAGS,
  type PaymentCategoryFlags,
} from '../types/paymentCategorySettings'
import {
  PAYMENT_CATEGORIES,
  type PaymentCategory,
} from '../constants/paymentCategories'

const SETTING_KEY = 'payment_category_flags'

function normalizeFlags(raw: unknown): PaymentCategoryFlags {
  const next = { ...DEFAULT_PAYMENT_CATEGORY_FLAGS }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return next

  for (const key of PAYMENT_CATEGORIES) {
    const value = (raw as Record<string, unknown>)[key]
    if (typeof value === 'boolean') next[key] = value
  }
  return next
}

export async function fetchPaymentCategoryFlags(): Promise<PaymentCategoryFlags> {
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
  if (!row?.setting_value) return { ...DEFAULT_PAYMENT_CATEGORY_FLAGS }
  return normalizeFlags(row.setting_value)
}

export async function savePaymentCategoryFlags(
  flags: PaymentCategoryFlags,
): Promise<PaymentCategoryFlags> {
  const payload = normalizeFlags(flags)

  await upsertCenterRewardSetting({
    settingKey: SETTING_KEY,
    settingValue: payload as unknown as Json,
    description: '결제 상품 카테고리 ON/OFF',
  })

  return payload
}

export function enabledPaymentCategories(
  flags: PaymentCategoryFlags,
): PaymentCategory[] {
  return PAYMENT_CATEGORIES.filter((key) => flags[key])
}

export function isPaymentCategoryEnabled(
  flags: PaymentCategoryFlags,
  category: PaymentCategory,
): boolean {
  return flags[category] === true
}
