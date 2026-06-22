import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isNotificationAuthorized } from '../_shared/notificationAuth.ts'
import {
  ptRemainingTemplateKey,
  sendMemberNotification,
} from '../_shared/notifications.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!isNotificationAuthorized(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = getSupabaseAdmin()
  const { data: members, error } = await supabase
    .from('members')
    .select('id, remaining_sessions, status')
    .eq('status', 'active')
    .in('remaining_sessions', [3, 1])

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  const results: Array<{
    memberId: string
    remaining: number
    templateKey: string
    status: string
    error?: string
  }> = []

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

  return jsonResponse({
    ok: true,
    processed: results.length,
    results,
  })
})
