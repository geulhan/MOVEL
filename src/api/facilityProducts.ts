import type {
  FacilityProduct,
  FacilitySubType,
  FacilitySubscriptionStatus,
  MemberFacilitySubscription,
} from '../types/database'
import { supabase } from '../lib/supabase'
import { todayDateString } from './members'
import { addDays } from '../utils/dates'

export type { FacilityProduct, MemberFacilitySubscription }

function resolveSubscriptionStatus(
  startsAt: string,
  endsAt: string,
  current: FacilitySubscriptionStatus,
): FacilitySubscriptionStatus {
  if (current === 'cancelled') return 'cancelled'
  const today = todayDateString()
  if (endsAt < today) return 'expired'
  if (startsAt > today) return 'scheduled'
  return 'active'
}

export async function fetchFacilityProducts(): Promise<FacilityProduct[]> {
  const { data, error } = await supabase
    .from('facility_products')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as FacilityProduct[]
}

export async function saveFacilityProduct(input: {
  id?: string
  label: string
  subType: FacilitySubType
  durationDays: number
  listAmount: number
  description?: string | null
  isActive: boolean
  sortOrder: number
}): Promise<FacilityProduct> {
  const payload = {
    label: input.label.trim(),
    sub_type: input.subType,
    duration_days: Math.max(1, Math.round(input.durationDays)),
    list_amount: Math.max(0, Math.round(input.listAmount)),
    description: input.description?.trim() || null,
    is_active: input.isActive,
    sort_order: input.sortOrder,
  }

  if (!payload.label) throw new Error('상품명을 입력해 주세요.')

  if (input.id) {
    const { data, error } = await supabase
      .from('facility_products')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) throw error
    return data as FacilityProduct
  }

  const { data, error } = await supabase
    .from('facility_products')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data as FacilityProduct
}

export async function assignFacilitySubscription(input: {
  memberId: string
  productId?: string | null
  label?: string
  subType?: FacilitySubType
  startsAt: string
  durationDays?: number
  amount?: number | null
  note?: string | null
  paymentHistoryId?: string | null
  createdBy?: string
}): Promise<MemberFacilitySubscription> {
  if (!input.startsAt) throw new Error('시작일을 입력해 주세요.')

  let label = input.label?.trim() ?? ''
  let durationDays = input.durationDays ?? 0
  let subType: FacilitySubType = input.subType ?? 'bundle'

  if (input.productId) {
    const { data: product, error } = await supabase
      .from('facility_products')
      .select('*')
      .eq('id', input.productId)
      .maybeSingle()
    if (error) throw error
    if (!product) throw new Error('상품을 찾을 수 없습니다.')
    if (!label) label = product.label
    if (!durationDays) durationDays = Number(product.duration_days)
    subType = product.sub_type as FacilitySubType
    if (input.amount == null && Number(product.list_amount) > 0) {
      input.amount = Number(product.list_amount)
    }
  }

  if (!label) throw new Error('이용 상품명을 입력해 주세요.')
  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new Error('이용 기간(일)을 올바르게 입력해 주세요.')
  }

  const endsAt = addDays(input.startsAt, durationDays - 1)
  const status = resolveSubscriptionStatus(input.startsAt, endsAt, 'scheduled')

  const { data, error } = await supabase
    .from('member_facility_subscriptions')
    .insert({
      member_id: input.memberId,
      product_id: input.productId ?? null,
      label,
      sub_type: subType,
      starts_at: input.startsAt,
      ends_at: endsAt,
      status,
      amount: input.amount ?? null,
      note: input.note?.trim() || null,
      payment_history_id: input.paymentHistoryId ?? null,
      created_by: input.createdBy ?? 'admin',
    })
    .select('*')
    .single()

  if (error) throw error
  return data as MemberFacilitySubscription
}

export function getActiveFacilityProducts(
  products: FacilityProduct[],
): FacilityProduct[] {
  return products.filter((product) => product.is_active)
}
