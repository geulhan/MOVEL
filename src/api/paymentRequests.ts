import { PAYMENT_REQUEST_EXPIRY_DAYS } from '../constants/pricing'
import { supabase } from '../lib/supabase'
import type { Member, PaymentHistory, PaymentRequest } from '../types/database'
import { createMemberPayment, syncMemberPaymentTotal } from './payments'
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

export async function fetchPaymentRequests(options?: {
  status?: PaymentRequest['status']
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
  if (options?.memberId) {
    query = query.eq('member_id', options.memberId)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw error
  const requests = data ?? []
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
  return data ?? []
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
  packageId?: string | null
  label: string
  sessions: number
  listAmount: number
  amount: number
  discountNote?: string | null
  note?: string | null
  createdBy?: string
}): Promise<PaymentRequest> {
  if (!input.label.trim()) {
    throw new Error('결제 요청 제목을 입력해 주세요.')
  }
  if (!Number.isInteger(input.sessions) || input.sessions < 1) {
    throw new Error('PT 횟수는 1 이상이어야 합니다.')
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

  const discountAmount = Math.max(0, Math.round(input.listAmount - input.amount))
  const now = new Date().toISOString()

  await supabase
    .from('payment_requests')
    .update({ status: 'cancelled', updated_at: now })
    .eq('member_id', input.memberId)
    .eq('status', 'pending')

  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      member_id: input.memberId,
      status: 'pending',
      package_id: input.packageId ?? null,
      label: input.label.trim(),
      sessions: input.sessions,
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
  return data
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
}

/** 센터 방문·계좌이체 등 오프라인 결제 완료 처리 */
export async function completePaymentRequestManually(
  requestId: string,
  options?: { milesToUse?: number },
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

  return fulfillPaymentRequest(request, options?.milesToUse ?? 0)
}

async function fulfillPaymentRequest(
  request: PaymentRequest,
  milesToUse = 0,
): Promise<PaymentHistory> {
  const noteParts = [request.label]
  if (request.discount_note) noteParts.push(request.discount_note)
  if (request.note) noteParts.push(request.note)

  const contractAmount = Number(request.amount)
  const payment = await createMemberPayment(request.member_id, {
    amount: contractAmount,
    sessions: request.sessions,
    paid_at: todayDateString(),
    note: noteParts.join(' · '),
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
