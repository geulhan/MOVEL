import { getCurrentCenterId } from '../lib/center'
import { normalizeMember } from '../lib/memberNormalize'
import { supabase } from '../lib/supabase'
import type {
  ConsultationRecord,
  Member,
  MemberMemo,
  PaymentHistory,
  SessionLog,
} from '../types/database'

export async function fetchMemberById(id: string): Promise<Member> {
  const centerId = await getCurrentCenterId()
  const { data: scoped, error: scopedError } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .eq('center_id', centerId)
    .maybeSingle()

  if (scopedError) throw scopedError

  if (scoped) {
    return normalizeMember(scoped)
  }

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error('회원을 찾을 수 없습니다.')
  }

  return normalizeMember(data)
}

export async function fetchPaymentHistory(
  memberId: string,
): Promise<PaymentHistory[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('payment_history')
    .select('*')
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .order('paid_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchSessionLogs(memberId: string): Promise<SessionLog[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('session_logs')
    .select('*')
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .order('deducted_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchMemos(memberId: string): Promise<MemberMemo[]> {
  const { data, error } = await supabase
    .from('member_memos')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createMemo(
  memberId: string,
  content: string,
): Promise<MemberMemo> {
  const { data, error } = await supabase
    .from('member_memos')
    .insert({ member_id: memberId, content: content.trim() })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateMemo(
  memoId: string,
  content: string,
): Promise<MemberMemo> {
  const { data, error } = await supabase
    .from('member_memos')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', memoId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMemo(memoId: string): Promise<void> {
  const { error } = await supabase
    .from('member_memos')
    .delete()
    .eq('id', memoId)

  if (error) throw error
}

export async function fetchConsultations(
  memberId: string,
): Promise<ConsultationRecord[]> {
  const { data, error } = await supabase
    .from('consultation_records')
    .select('*')
    .eq('member_id', memberId)
    .order('consulted_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createConsultation(
  memberId: string,
  content: string,
  consultedAt: string,
): Promise<ConsultationRecord> {
  const { data, error } = await supabase
    .from('consultation_records')
    .insert({
      member_id: memberId,
      content: content.trim(),
      consulted_at: consultedAt,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
