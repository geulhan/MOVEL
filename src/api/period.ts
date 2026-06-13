import { getCurrentCenterId } from '../lib/center'
import { normalizeMember } from '../lib/memberNormalize'
import { supabase } from '../lib/supabase'
import type { Member, PeriodExtension } from '../types/database'
import {
  calcMemberExpiry,
  calcPaymentExpiry,
} from '../utils/period'

async function fetchLatestPaymentAnchor(
  memberId: string,
): Promise<{ paid_at: string; sessions: number } | null> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('payment_history')
    .select('paid_at, sessions, created_at')
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .order('paid_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    paid_at: String(data.paid_at).slice(0, 10),
    sessions: Number(data.sessions),
  }
}

/** 결제 이력이 있으면 최신 결제 기준, 없으면 최초 등록일 기준 */
export async function resolveMemberExpiresAt(
  member: Member,
  extensionDays?: number,
): Promise<string | null> {
  const ext =
    extensionDays ?? (await getTotalExtensionDays(member.id))
  const latest = await fetchLatestPaymentAnchor(member.id)

  if (latest && latest.sessions > 0) {
    return calcPaymentExpiry(latest.paid_at, latest.sessions, ext)
  }

  if (member.total_sessions > 0) {
    return calcMemberExpiry(member.registered_at, member.total_sessions, ext)
  }

  return null
}

export async function recalcMemberExpiry(memberId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single()

  if (error) throw error

  const member = normalizeMember(data)
  const expires_at = await resolveMemberExpiresAt(member)

  const { error: updateError } = await supabase
    .from('members')
    .update({ expires_at })
    .eq('id', memberId)

  if (updateError) throw updateError
  return expires_at
}

export async function getTotalExtensionDays(memberId: string): Promise<number> {
  const { data, error } = await supabase
    .from('period_extensions')
    .select('days_added')
    .eq('member_id', memberId)

  if (error) throw error
  return (data ?? []).reduce((sum, row) => sum + row.days_added, 0)
}

export async function fetchPeriodExtensions(
  memberId: string,
): Promise<PeriodExtension[]> {
  const { data, error } = await supabase
    .from('period_extensions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function extendMemberPeriod(
  member: Member,
  daysAdded: number,
  note?: string,
): Promise<Member> {
  if (!Number.isInteger(daysAdded) || daysAdded < 1) {
    throw new Error('연장 일수는 1일 이상이어야 합니다.')
  }

  const { error: insertError } = await supabase
    .from('period_extensions')
    .insert({
      member_id: member.id,
      days_added: daysAdded,
      note: note?.trim() || null,
    })

  if (insertError) throw insertError

  await recalcMemberExpiry(member.id)

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', member.id)
    .single()

  if (error) throw error
  return normalizeMember(data)
}
