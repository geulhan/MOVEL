import { supabase } from '../lib/supabase'
import { normalizeMember } from '../lib/memberNormalize'
import type { Member, MemberInsert, MemberStatus } from '../types/database'
import { notifyMemberWelcome, notifyPaymentDone } from './notifications'
import { awardReferralOnPayment } from './rewards'
import { calcSessionExpiry } from '../utils/period'

export { normalizeMember }

function escapeIlikePattern(term: string): string {
  return term.replace(/[%_\\,().]/g, '\\$&')
}

export async function fetchMembers(search?: string): Promise<Member[]> {
  let query = supabase
    .from('members')
    .select('*')
    .order('registered_at', { ascending: false })
    .limit(5000)

  const term = search?.trim()
  if (term) {
    const pattern = `%${escapeIlikePattern(term)}%`
    query = query.or(
      `name.ilike.${pattern},phone.ilike.${pattern},trainer_name.ilike.${pattern}`,
    )
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => normalizeMember(row))
}

export async function createMember(input: {
  name: string
  phone: string
  total_sessions: number
  payment_amount: number
  registered_at: string
  trainer_id?: string | null
  trainer_name?: string | null
  referred_by_member_id?: string | null
  status?: MemberStatus
}): Promise<Member> {
  const expires_at = calcSessionExpiry(input.registered_at, input.total_sessions)

  const payload: MemberInsert = {
    name: input.name.trim(),
    phone: normalizePhone(input.phone),
    total_sessions: input.total_sessions,
    remaining_sessions: input.total_sessions,
    payment_amount: input.payment_amount,
    registered_at: input.registered_at,
    expires_at,
    trainer_id: input.trainer_id || null,
    trainer_name: input.trainer_name?.trim() || null,
    referred_by_member_id: input.referred_by_member_id || null,
    status: input.status ?? 'active',
  }

  const { data, error } = await supabase
    .from('members')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error

  const { data: paymentRow, error: paymentError } = await supabase
    .from('payment_history')
    .insert({
      member_id: data.id,
      amount: input.payment_amount,
      sessions: input.total_sessions,
      paid_at: input.registered_at,
      note: '회원 등록',
    })
    .select('id')
    .single()

  if (paymentError) {
    console.warn('payment_history 저장 실패:', paymentError.message)
  } else if (paymentRow) {
    const paymentId = (paymentRow as { id: string }).id
    try {
      await awardReferralOnPayment(data.id, paymentId, input.payment_amount)
    } catch (rewardErr) {
      console.warn('소개 리워드 적립 실패:', rewardErr)
    }
    notifyPaymentDone(data.id, paymentId)
  }

  notifyMemberWelcome(data.id)

  return normalizeMember(data)
}

export async function updateMemberTrainer(
  memberId: string,
  trainerId: string | null,
  trainerName: string | null,
): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .update({
      trainer_id: trainerId,
      trainer_name: trainerName,
    })
    .eq('id', memberId)
    .select('*')
    .single()

  if (error) throw error
  return normalizeMember(data)
}

/** 관리자: 회원 및 연관 데이터 삭제 (DB cascade) */
export async function deleteMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('members').delete().eq('id', memberId)
  if (error) throw error
}

export async function updateMemberStatus(
  memberId: string,
  status: MemberStatus,
): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .update({ status })
    .eq('id', memberId)
    .select('*')
    .single()

  if (error) throw error
  return normalizeMember(data)
}

/** 관리자: 잔여 PT 횟수 직접 수정 (만료일은 변경하지 않음) */
export async function updateMemberRemainingSessions(
  memberId: string,
  remainingSessions: number,
): Promise<Member> {
  if (!Number.isInteger(remainingSessions) || remainingSessions < 0) {
    throw new Error('잔여 횟수는 0 이상의 정수여야 합니다.')
  }

  const { data: current, error: fetchError } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single()

  if (fetchError) throw fetchError
  const member = normalizeMember(current)

  if (remainingSessions > member.total_sessions) {
    throw new Error(
      `잔여 횟수는 등록 횟수(${member.total_sessions}회)를 초과할 수 없습니다.`,
    )
  }

  const { data, error } = await supabase
    .from('members')
    .update({ remaining_sessions: remainingSessions })
    .eq('id', memberId)
    .select('*')
    .single()

  if (error) throw error
  return normalizeMember(data)
}

export async function deductSession(memberId: string): Promise<Member> {
  const { data: current, error: fetchError } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single()

  if (fetchError) throw fetchError
  const member = normalizeMember(current)

  if (member.status !== 'active') {
    throw new Error('활성 상태 회원만 PT 차감할 수 있습니다.')
  }
  if (member.remaining_sessions <= 0) {
    throw new Error('남은 PT 횟수가 없습니다.')
  }
  if (member.expires_at && isExpired(member.expires_at)) {
    throw new Error('만료일이 지난 회원입니다.')
  }

  const newRemaining = member.remaining_sessions - 1

  const { data, error } = await supabase
    .from('members')
    .update({ remaining_sessions: newRemaining })
    .eq('id', memberId)
    .select('*')
    .single()

  if (error) throw error

  const { error: logError } = await supabase.from('session_logs').insert({
    member_id: memberId,
    quantity: 1,
    remaining_after: newRemaining,
  })

  if (logError) {
    await supabase
      .from('members')
      .update({ remaining_sessions: member.remaining_sessions })
      .eq('id', memberId)
    throw logError
  }

  return normalizeMember(data)
}

/** 출석 취소 시 PT 1회 복구 (총 등록 횟수 초과 불가) */
export async function restoreOneSession(memberId: string): Promise<Member> {
  const { data: current, error: fetchError } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single()

  if (fetchError) throw fetchError
  const member = normalizeMember(current)

  if (member.remaining_sessions >= member.total_sessions) {
    throw new Error('복구할 PT 횟수가 없습니다.')
  }

  const newRemaining = member.remaining_sessions + 1

  const { data, error } = await supabase
    .from('members')
    .update({ remaining_sessions: newRemaining })
    .eq('id', memberId)
    .select('*')
    .single()

  if (error) throw error
  return normalizeMember(data)
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function formatPhone(phone: string): string {
  const digits = normalizePhone(phone)
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

export function formatDate(date: string | null): string {
  if (!date) return '-'
  const [year, month, day] = date.split('T')[0].split('-')
  if (!year || !month || !day) return date
  return `${year}.${month}.${day}`
}

export function todayDateString(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function isExpired(expiresAt: string): boolean {
  return expiresAt < todayDateString()
}
