import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import {
  addDaysKst,
  daysBetweenKst,
  sendMemberNotification,
} from '../_shared/notifications.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'

const REMINDER_DAYS = [7, 3, 1] as const

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('NOTIFICATION_INTERNAL_SECRET')
  const headerKey = req.headers.get('x-mobel-notification-key')
  if (secret && headerKey === secret) return true

  const auth = req.headers.get('authorization') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceRole && auth === `Bearer ${serviceRole}`) return true

  return false
}

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

  if (!isAuthorized(req)) {
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
    .select('id, name, expires_at, status')
    .eq('status', 'active')
    .in('expires_at', expiresList)

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  const results: Array<{
    memberId: string
    daysLeft: number
    status: string
    error?: string
  }> = []

  for (const member of members ?? []) {
    if (!member.expires_at) continue
    const daysLeft = daysBetweenKst(today, member.expires_at.split('T')[0])
    if (!REMINDER_DAYS.includes(daysLeft as (typeof REMINDER_DAYS)[number])) {
      continue
    }

    const result = await sendMemberNotification({
      templateKey: 'renewal',
      memberId: member.id,
      metadata: { days_left: daysLeft },
    })

    results.push({
      memberId: member.id,
      daysLeft,
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
