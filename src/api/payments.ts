import { getCurrentCenterId } from '../lib/center'
import { fetchMemberById } from './memberDetail'
import { notifyPaymentDone } from './notifications'
import { logPlatformActivity } from './platformActivity'
import { awardCustomRulesOnPayment, awardReferralOnPayment } from './rewards'
import { recalcMemberExpiry } from './period'
import { supabase } from '../lib/supabase'
import type { PtPayment, PtSessionLog } from '../lib/recognitionRevenue'
import type { PaymentCategory, PaymentHistory } from '../types/database'

export async function createPaymentRecord(
  memberId: string,
  input: {
    amount: number
    paid_at: string
    note?: string | null
    category?: PaymentCategory
    sessions?: number
  },
): Promise<PaymentHistory> {
  const category = input.category ?? 'pt'
  const sessions = category === 'pt' ? (input.sessions ?? 1) : 0

  if (!input.paid_at) {
    throw new Error('결제일을 입력해 주세요.')
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error('결제 금액을 올바르게 입력해 주세요.')
  }
  if (category === 'pt' && (!Number.isInteger(sessions) || sessions < 1)) {
    throw new Error('등록 횟수는 1 이상의 정수여야 합니다.')
  }

  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('payment_history')
    .insert({
      center_id: centerId,
      member_id: memberId,
      amount: input.amount,
      sessions,
      paid_at: input.paid_at,
      note: input.note?.trim() || null,
      category,
    })
    .select()
    .single()

  if (error) throw error

  if (category === 'pt' && sessions > 0) {
    await applySessionsDeltaToMember(memberId, sessions)
    await recalcMemberExpiry(memberId)
  }
  await syncMemberPaymentTotal(memberId)

  try {
    await awardReferralOnPayment(memberId, data.id, input.amount)
  } catch (rewardErr) {
    console.warn('소개 리워드 적립 실패:', rewardErr)
  }

  try {
    await awardCustomRulesOnPayment(
      memberId,
      data.id,
      input.amount,
      category,
    )
  } catch (rewardErr) {
    console.warn('추가 적립 규칙 처리 실패:', rewardErr)
  }

  notifyPaymentDone(memberId, data.id)

  void logPlatformActivity('payment_registered', {
    centerId,
    metadata: { payment_id: data.id, member_id: memberId, amount: input.amount },
  })

  return data
}

export async function createMemberPayment(
  memberId: string,
  input: {
    amount: number
    sessions: number
    paid_at: string
    note?: string | null
  },
): Promise<PaymentHistory> {
  return createPaymentRecord(memberId, {
    ...input,
    category: 'pt',
  })
}

export async function updatePayment(
  paymentId: string,
  memberId: string,
  input: { paid_at: string; amount: number; sessions: number },
): Promise<PaymentHistory> {
  if (!input.paid_at) {
    throw new Error('결제일을 입력해 주세요.')
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error('결제 금액을 올바르게 입력해 주세요.')
  }
  if (!Number.isInteger(input.sessions) || input.sessions < 0) {
    throw new Error('등록 횟수는 0 이상의 정수여야 합니다.')
  }

  const centerId = await getCurrentCenterId()
  const { data: current, error: fetchError } = await supabase
    .from('payment_history')
    .select('sessions')
    .eq('id', paymentId)
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .single()

  if (fetchError) throw fetchError

  const oldSessions = Number(current.sessions)
  const sessionsDelta = input.sessions - oldSessions

  if (sessionsDelta !== 0) {
    const member = await fetchMemberById(memberId)
    const nextRemaining = member.remaining_sessions + sessionsDelta
    if (nextRemaining < 0) {
      throw new Error(
        `등록 횟수를 줄이면 잔여 PT가 음수가 됩니다. (현재 잔여 ${member.remaining_sessions}회)`,
      )
    }
    if (member.total_sessions + sessionsDelta < 0) {
      throw new Error('등록 횟수를 올바르게 입력해 주세요.')
    }
    await applySessionsDeltaToMember(memberId, sessionsDelta)
  }

  const { data, error } = await supabase
    .from('payment_history')
    .update({
      paid_at: input.paid_at,
      amount: input.amount,
      sessions: input.sessions,
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) throw error

  await recalcMemberExpiry(memberId)
  await syncMemberPaymentTotal(memberId)
  return data
}

export async function deletePayment(
  paymentId: string,
  memberId: string,
): Promise<void> {
  const centerId = await getCurrentCenterId()
  const { data: current, error: fetchError } = await supabase
    .from('payment_history')
    .select('sessions, category')
    .eq('id', paymentId)
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .single()

  if (fetchError) throw fetchError

  const category = (current.category as PaymentCategory | null) ?? 'pt'
  const sessions = Number(current.sessions)

  if (category === 'pt' && sessions > 0) {
    const member = await fetchMemberById(memberId)
    const nextRemaining = member.remaining_sessions - sessions
    if (nextRemaining < 0) {
      throw new Error(
        `이 결제를 삭제하면 잔여 PT가 음수가 됩니다. (현재 잔여 ${member.remaining_sessions}회, 결제 PT ${sessions}회)`,
      )
    }
    if (member.total_sessions - sessions < 0) {
      throw new Error('PT 횟수를 더 이상 줄일 수 없습니다.')
    }
    await applySessionsDeltaToMember(memberId, -sessions)
  }

  const { error } = await supabase
    .from('payment_history')
    .delete()
    .eq('id', paymentId)
    .eq('member_id', memberId)
    .eq('center_id', centerId)

  if (error) throw error

  if (category === 'pt' && sessions > 0) {
    await recalcMemberExpiry(memberId)
  }
  await syncMemberPaymentTotal(memberId)
}

async function applySessionsDeltaToMember(
  memberId: string,
  sessionsDelta: number,
): Promise<void> {
  if (sessionsDelta === 0) return

  const member = await fetchMemberById(memberId)
  const newTotal = member.total_sessions + sessionsDelta
  const newRemaining = member.remaining_sessions + sessionsDelta

  if (newTotal < 0 || newRemaining < 0) {
    throw new Error('PT 횟수를 더 이상 줄일 수 없습니다.')
  }

  const { error } = await supabase
    .from('members')
    .update({
      total_sessions: newTotal,
      remaining_sessions: newRemaining,
    })
    .eq('id', memberId)

  if (error) throw error
}

export async function syncMemberPaymentTotal(memberId: string): Promise<void> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('payment_history')
    .select('amount')
    .eq('member_id', memberId)
    .eq('center_id', centerId)

  if (error) throw error

  const total = (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)

  const { error: updateError } = await supabase
    .from('members')
    .update({ payment_amount: total })
    .eq('id', memberId)

  if (updateError) throw updateError
}

/** 출석 정산용 PT 결제·차감 이력 (결제 건별 FIFO 단가) */
export async function fetchCenterPtPayrollInputs(): Promise<{
  payments: PtPayment[]
  sessionLogs: PtSessionLog[]
}> {
  const centerId = await getCurrentCenterId()
  const [paymentsRes, logsRes] = await Promise.all([
    supabase
      .from('payment_history')
      .select('id, member_id, amount, sessions, paid_at')
      .eq('center_id', centerId)
      .eq('category', 'pt'),
    supabase
      .from('session_logs')
      .select('id, member_id, deducted_at, quantity')
      .eq('center_id', centerId),
  ])

  if (paymentsRes.error) throw paymentsRes.error
  if (logsRes.error) throw logsRes.error

  const payments: PtPayment[] = (paymentsRes.data ?? []).map((row) => ({
    id: String(row.id),
    memberId: String(row.member_id),
    amount: Number(row.amount),
    sessions: Number(row.sessions),
    paidAt: String(row.paid_at),
  }))

  const sessionLogs: PtSessionLog[] = (logsRes.data ?? []).map((row) => ({
    id: String(row.id),
    memberId: String(row.member_id),
    deductedAt: String(row.deducted_at),
    quantity: Number(row.quantity ?? 1),
  }))

  return { payments, sessionLogs }
}
