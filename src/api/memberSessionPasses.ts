import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import {
  classRequiresSessionPass,
  type ClassType,
  type PassType,
} from './classes'

export type SessionPassType = 'pilates' | 'yoga' | 'gx' | 'group_pt'

const PASS_LABELS: Record<SessionPassType, string> = {
  pilates: '필라테스',
  yoga: '요가',
  gx: 'GX',
  group_pt: '소그룹 PT',
}

export function sessionPassLabel(passType: SessionPassType): string {
  return PASS_LABELS[passType]
}

export { classRequiresSessionPass }

export type MemberSessionPassSummary = {
  pass_type: SessionPassType
  remaining_sessions: number
  is_unlimited: boolean
  label: string
}

export async function fetchMemberActiveSessionPasses(
  memberId: string,
): Promise<MemberSessionPassSummary[]> {
  const centerId = await getCurrentCenterId(memberId)
  const { data, error } = await supabase
    .from('member_session_passes')
    .select('pass_type, remaining_sessions, is_unlimited, label')
    .eq('center_id', centerId)
    .eq('member_id', memberId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => ({
    pass_type: row.pass_type as SessionPassType,
    remaining_sessions: Number(row.remaining_sessions ?? 0),
    is_unlimited: Boolean(row.is_unlimited),
    label: String(row.label ?? ''),
  }))
}

/** 수강권·잔여 PT로 예약 가능한 회원 ID (수강권 불필요 시 null = 전체 허용) */
export async function fetchEligibleMemberIdsForClassPass(
  passType: PassType,
  deductSessions: boolean,
): Promise<Set<string> | null> {
  if (!classRequiresSessionPass(passType, deductSessions)) return null

  const centerId = await getCurrentCenterId()
  const eligible = new Set<string>()

  const { data: passes, error: passError } = await supabase
    .from('member_session_passes')
    .select('member_id, remaining_sessions, is_unlimited')
    .eq('center_id', centerId)
    .eq('pass_type', passType)
    .eq('status', 'active')

  if (passError) throw passError

  for (const row of passes ?? []) {
    if (row.is_unlimited || Number(row.remaining_sessions ?? 0) > 0) {
      eligible.add(String(row.member_id))
    }
  }

  if (passType === 'group_pt') {
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('center_id', centerId)
      .eq('status', 'active')
      .gt('remaining_sessions', 0)

    if (memberError) throw memberError
    for (const row of members ?? []) {
      eligible.add(String(row.id))
    }
  }

  return eligible
}

export function canMemberBookWithPasses(
  schedule: {
    pass_type?: PassType
    deduct_sessions?: boolean
    class_type?: ClassType
  },
  passes: MemberSessionPassSummary[],
  ptRemaining: number,
): boolean {
  const passType = schedule.pass_type ?? schedule.class_type ?? 'pilates'
  const deductSessions = schedule.deduct_sessions ?? true
  if (!classRequiresSessionPass(passType, deductSessions)) return true

  if (passType === 'none') return true

  const pass = passes.find((p) => p.pass_type === passType)
  if (pass?.is_unlimited || (pass && pass.remaining_sessions > 0)) return true
  if (passType === 'group_pt' && ptRemaining > 0) return true
  return false
}

export async function assignSessionPass(input: {
  memberId: string
  passType: SessionPassType
  label: string
  sessionsToAdd: number
  amount?: number
  paymentHistoryId?: string
}): Promise<void> {
  const centerId = await getCurrentCenterId(input.memberId)
  const add = Math.max(1, Math.round(input.sessionsToAdd))

  const { data: existing, error: fetchError } = await supabase
    .from('member_session_passes')
    .select('*')
    .eq('center_id', centerId)
    .eq('member_id', input.memberId)
    .eq('pass_type', input.passType)
    .eq('status', 'active')
    .eq('is_unlimited', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (existing) {
    const total = Number(existing.total_sessions ?? 0) + add
    const remaining = Number(existing.remaining_sessions ?? 0) + add
    const { error } = await supabase
      .from('member_session_passes')
      .update({
        total_sessions: total,
        remaining_sessions: remaining,
        label: input.label.trim() || existing.label,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(existing.id))
    if (error) throw error
    return
  }

  const { error } = await supabase.from('member_session_passes').insert({
    center_id: centerId,
    member_id: input.memberId,
    pass_type: input.passType,
    label: input.label.trim() || `${PASS_LABELS[input.passType]} ${add}회`,
    total_sessions: add,
    remaining_sessions: add,
    is_unlimited: false,
    status: 'active',
  })

  if (error) throw error
}
