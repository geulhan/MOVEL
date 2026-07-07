import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isNotificationAuthorized } from '../_shared/notificationAuth.ts'
import {
  addDaysKst,
  daysBetweenKst,
  membershipExpireTemplateKey,
  sendMemberNotification,
} from '../_shared/notifications.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'

const REMINDER_DAYS = [14, 7, 0] as const

function todayKst(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!(await isNotificationAuthorized(req))) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = getSupabaseAdmin()
  const today = todayKst()
  const targetDates = REMINDER_DAYS.map((d) => ({
    daysLeft: d,
    expiresAt: addDaysKst(today, d),
  }))

  const expiresList = targetDates.map((t) => t.expiresAt)

  const { data: members, error } = await supabase
    .from('members')
    .select('id, name, expires_at, remaining_sessions, status')
    .eq('status', 'active')
    .in('expires_at', expiresList)

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  const results: Array<{
    memberId: string
    daysLeft: number
    templateKey: string
    status: string
    error?: string
  }> = []

  for (const member of members ?? []) {
    if (!member.expires_at) continue
    const expireDate = member.expires_at.split('T')[0]
    const daysLeft = daysBetweenKst(today, expireDate)
    const templateKey = membershipExpireTemplateKey(daysLeft)
    if (!templateKey) continue

    const result = await sendMemberNotification({
      templateKey,
      memberId: member.id,
      metadata: {
        days_left: daysLeft,
        expire_date: expireDate,
        remaining_count: member.remaining_sessions,
      },
    })

    results.push({
      memberId: member.id,
      daysLeft,
      templateKey,
      status: result.status,
      error: result.error ?? result.skippedReason,
    })
  }

  return jsonResponse({
    ok: true,
    date: today,
    processed: results.length,
    results,
  })
})
