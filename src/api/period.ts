import { normalizeMember } from '../lib/memberNormalize'
import { supabase } from '../lib/supabase'
import type { Member, PeriodExtension } from '../types/database'
import { calcMemberExpiry } from '../utils/period'

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

  const extensionDays = await getTotalExtensionDays(member.id)
  const expires_at = calcMemberExpiry(
    member.registered_at,
    member.total_sessions,
    extensionDays,
  )

  const { data, error } = await supabase
    .from('members')
    .update({ expires_at })
    .eq('id', member.id)
    .select('*')
    .single()

  if (error) throw error
  return normalizeMember(data)
}

export function resolveMemberExpiry(
  member: Member,
  extensionDays: number,
): string {
  return calcMemberExpiry(
    member.registered_at,
    member.total_sessions,
    extensionDays,
  )
}
