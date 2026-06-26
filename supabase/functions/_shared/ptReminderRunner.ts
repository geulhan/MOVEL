import { ptRemainingTemplateKey, sendMemberNotification } from './notifications.ts'
import { getSupabaseAdmin } from './supabaseAdmin.ts'

export type PtReminderRunResult = {
  processed: number
  results: Array<{
    memberId: string
    remaining: number
    templateKey: string
    status: string
    error?: string
  }>
}

export async function runPtReminders(): Promise<PtReminderRunResult> {
  const supabase = getSupabaseAdmin()
  const { data: members, error } = await supabase
    .from('members')
    .select('id, remaining_sessions, total_sessions, status')
    .eq('status', 'active')
    .gt('total_sessions', 0)
    .in('remaining_sessions', [3, 1])

  if (error) throw error

  const results: PtReminderRunResult['results'] = []

  for (const member of members ?? []) {
    const remaining = Number(member.remaining_sessions)
    const templateKey = ptRemainingTemplateKey(remaining)
    if (!templateKey) continue

    const result = await sendMemberNotification({
      templateKey,
      memberId: member.id,
      metadata: {
        remaining_count: remaining,
        membership_key: `${member.id}:${remaining}`,
      },
    })

    results.push({
      memberId: member.id,
      remaining,
      templateKey,
      status: result.status,
      error: result.error ?? result.skippedReason,
    })
  }

  return {
    processed: results.length,
    results,
  }
}
