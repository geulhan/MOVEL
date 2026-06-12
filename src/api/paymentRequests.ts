import { PAYMENT_REQUEST_EXPIRY_DAYS } from '../constants/pricing'
import type { PaymentCategory } from '../constants/paymentCategories'
import { supabase } from '../lib/supabase'
import type { Member, PaymentHistory, PaymentRequest } from '../types/database'
import {
  assertContractSignedForPayment,
  cancelContractForPaymentRequest,
  createContractForPaymentRequest,
} from './contracts'
import { assignCenterPass } from './centerPasses'
import { assignFacilitySubscription } from './facilityProducts'
import { createPaymentRecord, syncMemberPaymentTotal } from './payments'
import { redeemMilesForPayment } from './rewards'
import { todayDateString } from './members'

export type PaymentRequestWithMember = PaymentRequest & {
  member?: Pick<Member, 'id' | 'name' | 'phone'> | null
}

function addDaysIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function normalizePaymentRequest(row: PaymentRequest): PaymentRequest {
  return {
    ...row,
    category: row.category ?? 'pt',
    sessions: row.sessions ?? null,
    duration_days: row.duration_days ?? null,
    starts_at: row.starts_at ?? null,
  }
}

export async function fetchPaymentRequests(options?: {
  status?: PaymentRequest['status']
  category?: PaymentCategory | 'all'
  memberId?: string
  limit?: number
}): Promise<PaymentRequestWithMember[]> {
  let query = supabase
    .from('payment_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }
  if (options?.category && options.category !== 'all') {
    query = query.eq('category', options.category)
  }
  if (options?.memberId) {
    query = query.eq('member_id', options.memberId)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw error
  const requests = (data ?? []).map((row) =>
    normalizePaymentRequest(row as PaymentRequest),
  )
  if (requests.length === 0) return []

  const memberIds = [...new Set(requests.map((row) => row.member_id))]
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name, phone')
    .in('id', memberIds)

  if (membersError) throw membersError
  const memberMap = new Map((members ?? []).map((member) => [member.id, member]))

  return requests.map((request) => ({
    ...request,
    member: memberMap.get(request.member_id) ?? null,
  }))
}

export async function fetchMemberPendingPaymentRequests(
  memberId: string,
): Promise<PaymentRequest[]> {
  await expireStalePaymentRequests(memberId)

  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('member_id', memberId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => normalizePaymentRequest(row as PaymentRequest))
}

async function expireStalePaymentRequests(memberId?: string): Promise<void> {
  const now = new Date().toISOString()
  let query = supabase
    .from('payment_requests')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'pending')
    .lt('expires_at', now)

  if (memberId) {
    query = query.eq('member_id', memberId)
  }

  await query
}

export async function createPaymentRequest(input: {
  memberId: string
  category: PaymentCategory
  packageId?: string | null
  label: string
  sessions?: number | null
  durationDays?: number | null
  listAmount: number
  amount: number
  discountNote?: string | null
  note?: string | null
  startsAt?: string | null
  createdBy?: string
}): Promise<PaymentRequest> {
  if (!input.label.trim()) {
    throw new Error('결제 요청 제목을 입력해 주세요.')
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error('결제 금액을 올바르게 입력해 주세요.')
  }
  if (!Number.isFinite(input.listAmount) || input.listAmount < 0) {
    throw new Error('정가를 올바르게 입력해 주세요.')
  }
  if (input.amount > input.listAmount) {
    throw new Error('결제 금액은 정가보다 클 수 없습니다.')
  }

  if (input.category === 'pt') {
    if (!Number.isInteger(input.sessions) || (input.sessions ?? 0) < 1) {
      throw new Error('PT 횟수는 1 이상이어야 합니다.')
    }
  } else {
    if (!Number.isInteger(input.durationDays) || (input.durationDays ?? 0) < 1) {
      throw new Error('이용 기간(일)은 1 이상이어야 합니다.')
    }
    if (!input.startsAt?.trim()) {
      throw new Error('이용 시작일을 입력해 주세요.')
    }
  }

  const discountAmount = Math.max(0, Math.round(input.listAmount - input.amount))
  const now = new Date().toISOString()

  await supabase
    .from('payment_requests')
    .update({ status: 'cancelled', updated_at: now })
    .eq('member_id', input.memberId)
    .eq('category', input.category)
    .eq('status', 'pending')

  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      member_id: input.memberId,
      category: input.category,
      status: 'pending',
      package_id: input.packageId ?? null,
      label: input.label.trim(),
      sessions: input.category === 'pt' ? input.sessions ?? null : null,
      duration_days:
        input.category === 'pt' ? null : input.durationDays ?? null,
      starts_at: input.category === 'pt' ? null : input.startsAt?.trim() ?? null,
      list_amount: Math.round(input.listAmount),
      amount: Math.round(input.amount),
      discount_amount: discountAmount,
      discount_note: input.discountNote?.trim() || null,
      note: input.note?.trim() || null,
      expires_at: addDaysIso(PAYMENT_REQUEST_EXPIRY_DAYS),
      created_by: input.createdBy ?? 'admin',
    })
    .select('*')
    .single()

  if (error) throw error
  const request = normalizePaymentRequest(data as PaymentRequest)
  await createContractForPaymentRequest(request)
  return request
}

export async function cancelPaymentRequest(requestId: string): Promise<void> {
  const { data, error } = await supabase
    .from('payment_requests')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error('취소할 결제 요청이 없거나 이미 처리되었습니다.')
  }

  await cancelContractForPaymentRequest(requestId)
}

export async function completePaymentRequestManually(
  requestId: string,
  options?: { milesToUse?: number; startsAt?: string },
): Promise<PaymentHistory> {
  const { data: request, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()

  if (error) throw error
  if (!request) throw new Error('결제 요청을 찾을 수 없습니다.')
  if (request.status !== 'pending') {
    throw new Error('이미 처리된 결제 요청입니다.')
  }

  return fulfillPaymentRequest(
    normalizePaymentRequest(request as PaymentRequest),
    {
      milesToUse: options?.milesToUse ?? 0,
      startsAt: options?.startsAt,
    },
  )
}

async function fulfillPaymentRequest(
  request: PaymentRequest,
  options: { milesToUse?: number; startsAt?: string } = {},
): Promise<PaymentHistory> {
  await assertContractSignedForPayment(request.id)

  const milesToUse = options.milesToUse ?? 0
  const noteParts = [request.label]
  if (request.discount_note) noteParts.push(request.discount_note)
  if (request.note) noteParts.push(request.note)

  const contractAmount = Number(request.amount)
  const category = request.category ?? 'pt'
  const payment = await createPaymentRecord(request.member_id, {
    amount: contractAmount,
    paid_at: todayDateString(),
    note: noteParts.join(' · '),
    category,
    sessions: category === 'pt' ? request.sessions ?? 1 : 0,
  })

  let finalPayment = payment
  if (milesToUse > 0) {
    const { milesUsed, cashAmount } = await redeemMilesForPayment(
      request.member_id,
      contractAmount,
      milesToUse,
      payment.id,
    )
    if (milesUsed > 0) {
      const mileNote = `MILE ${milesUsed.toLocaleString()}M 사용 (실수납 ${cashAmount.toLocaleString()}원)`
      const { data: updated, error: mileUpdateError } = await supabase
        .from('payment_history')
        .update({
          amount: cashAmount,
          note: [payment.note, mileNote].filter(Boolean).join(' · '),
        })
        .eq('id', payment.id)
        .select()
        .single()

      if (mileUpdateError) throw mileUpdateError
      finalPayment = updated
      await syncMemberPaymentTotal(request.member_id)
    }
  }

  await supabase
    .from('payment_history')
    .update({
      source: 'payment_request',
      payment_request_id: request.id,
    })
    .eq('id', payment.id)

  const startsAt =
    options.startsAt?.trim() ||
    request.starts_at?.trim() ||
    todayDateString()
  if (category === 'center_pass') {
    await assignCenterPass({
      memberId: request.member_id,
      productId: request.package_id,
      label: request.label,
      startsAt,
      durationDays: request.duration_days ?? undefined,
      amount: contractAmount,
      note: request.note,
      paymentHistoryId: payment.id,
      createdBy: 'payment_request',
    })
  } else if (category === 'locker_towel') {
    await assignFacilitySubscription({
      memberId: request.member_id,
      productId: request.package_id,
      label: request.label,
      startsAt,
      durationDays: request.duration_days ?? undefined,
      amount: contractAmount,
      note: request.note,
      paymentHistoryId: payment.id,
      createdBy: 'payment_request',
    })
  }

  const { error: updateError } = await supabase
    .from('payment_requests')
    .update({
      status: 'paid',
      payment_history_id: payment.id,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id)

  if (updateError) throw updateError
  return finalPayment
}

export function formatDiscountSummary(request: PaymentRequest): string | null {
  if (request.discount_amount <= 0) return null
  const parts = [`-${request.discount_amount.toLocaleString('ko-KR')}원`]
  if (request.discount_note) parts.push(request.discount_note)
  return parts.join(' · ')
}
