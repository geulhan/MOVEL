import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'

export type SessionPassType = 'pilates' | 'yoga' | 'gx' | 'group_pt'

const PASS_LABELS: Record<SessionPassType, string> = {
  pilates: '필라테스',
  yoga: '요가',
  gx: 'GX',
  group_pt: '소그룹 PT',
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
