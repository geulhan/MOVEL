import { CENTER_PASS_STATUS_LABELS, type CenterPassStatus } from '../constants/centerPasses'
import { supabase } from '../lib/supabase'
import { todayDateString } from './members'
import { addDays } from '../utils/dates'

export type CenterPassProduct = {
  id: string
  label: string
  duration_days: number
  list_amount: number
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CenterPass = {
  id: string
  member_id: string
  product_id: string | null
  label: string
  starts_at: string
  ends_at: string
  status: CenterPassStatus
  amount: number | null
  note: string | null
  payment_history_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type CenterPassWithMember = CenterPass & {
  member_name?: string | null
}

function resolvePassStatus(
  startsAt: string,
  endsAt: string,
  current: CenterPassStatus,
): CenterPassStatus {
  if (current === 'cancelled') return 'cancelled'
  const today = todayDateString()
  if (endsAt < today) return 'expired'
  if (startsAt > today) return 'scheduled'
  return 'active'
}

export async function fetchCenterPassProducts(): Promise<CenterPassProduct[]> {
  const { data, error } = await supabase
    .from('center_pass_products')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as CenterPassProduct[]
}

export async function saveCenterPassProduct(input: {
  id?: string
  label: string
  durationDays: number
  listAmount: number
  description?: string | null
  isActive: boolean
  sortOrder: number
}): Promise<CenterPassProduct> {
  const payload = {
    label: input.label.trim(),
    duration_days: Math.max(1, Math.round(input.durationDays)),
    list_amount: Math.max(0, Math.round(input.listAmount)),
    description: input.description?.trim() || null,
    is_active: input.isActive,
    sort_order: input.sortOrder,
  }

  if (!payload.label) throw new Error('이용권 상품명을 입력해 주세요.')

  if (input.id) {
    const { data, error } = await supabase
      .from('center_pass_products')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) throw error
    return data as CenterPassProduct
  }

  const { data, error } = await supabase
    .from('center_pass_products')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data as CenterPassProduct
}

export async function fetchMemberCenterPasses(
  memberId: string,
): Promise<CenterPass[]> {
  const { data, error } = await supabase
    .from('center_passes')
    .select('*')
    .eq('member_id', memberId)
    .order('starts_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as CenterPass[]).map((row) => ({
    ...row,
    status: resolvePassStatus(row.starts_at, row.ends_at, row.status),
  }))
}

export async function fetchMemberActiveCenterPass(
  memberId: string,
): Promise<CenterPass | null> {
  const passes = await fetchMemberCenterPasses(memberId)
  const today = todayDateString()
  return (
    passes.find(
      (pass) =>
        pass.status !== 'cancelled' &&
        pass.starts_at <= today &&
        pass.ends_at >= today,
    ) ?? null
  )
}

export async function fetchCenterPasses(options?: {
  memberId?: string
  limit?: number
}): Promise<CenterPassWithMember[]> {
  let query = supabase
    .from('center_passes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 100)

  if (options?.memberId) {
    query = query.eq('member_id', options.memberId)
  }

  const { data, error } = await query
  if (error) throw error
  const rows = ((data ?? []) as CenterPass[]).map((row) => ({
    ...row,
    status: resolvePassStatus(row.starts_at, row.ends_at, row.status),
  }))
  if (rows.length === 0) return []

  const memberIds = [...new Set(rows.map((row) => row.member_id))]
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name')
    .in('id', memberIds)

  if (membersError) throw membersError
  const nameMap = new Map((members ?? []).map((member) => [member.id, member.name]))

  return rows.map((row) => ({
    ...row,
    member_name: nameMap.get(row.member_id) ?? null,
  }))
}

export async function assignCenterPass(input: {
  memberId: string
  productId?: string | null
  label?: string
  startsAt: string
  durationDays?: number
  amount?: number | null
  note?: string | null
  paymentHistoryId?: string | null
  createdBy?: string
}): Promise<CenterPass> {
  if (!input.startsAt) throw new Error('시작일을 입력해 주세요.')

  let label = input.label?.trim() ?? ''
  let durationDays = input.durationDays ?? 0

  if (input.productId) {
    const { data: product, error } = await supabase
      .from('center_pass_products')
      .select('*')
      .eq('id', input.productId)
      .maybeSingle()
    if (error) throw error
    if (!product) throw new Error('이용권 상품을 찾을 수 없습니다.')
    if (!label) label = product.label
    if (!durationDays) durationDays = Number(product.duration_days)
    if (input.amount == null && Number(product.list_amount) > 0) {
      input.amount = Number(product.list_amount)
    }
  }

  if (!label) throw new Error('이용권 이름을 입력해 주세요.')
  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new Error('이용 기간(일)을 올바르게 입력해 주세요.')
  }

  const endsAt = addDays(input.startsAt, durationDays - 1)
  const status = resolvePassStatus(input.startsAt, endsAt, 'scheduled')

  const { data, error } = await supabase
    .from('center_passes')
    .insert({
      member_id: input.memberId,
      product_id: input.productId ?? null,
      label,
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
  return data as CenterPass
}

export async function cancelCenterPass(passId: string): Promise<void> {
  const { error } = await supabase
    .from('center_passes')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', passId)

  if (error) throw error
}

export function formatCenterPassPeriod(pass: CenterPass): string {
  return `${pass.starts_at} ~ ${pass.ends_at}`
}

export function centerPassStatusLabel(status: CenterPassStatus): string {
  return CENTER_PASS_STATUS_LABELS[status]
}
