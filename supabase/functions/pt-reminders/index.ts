import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { sendMemberNotification } from '../_shared/notifications.ts'
import { formatScheduledAtKst } from '../_shared/templates.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'

const REMINDER_HOURS = 24
const WINDOW_HOURS = 1

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('NOTIFICATION_INTERNAL_SECRET')
  const headerKey = req.headers.get('x-mobel-notification-key')
  if (secret && headerKey === secret) return true

  const auth = req.headers.get('authorization') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceRole && auth === `Bearer ${serviceRole}`) return true

  return false
}

type ScheduleRow = {
  id: string
  member_id: string
  scheduled_at: string
  trainers: { name: string } | { name: string }[] | null
}

function trainerName(row: ScheduleRow): string {
  const trainer = row.trainers
  if (!trainer) return ''
  if (Array.isArray(trainer)) return trainer[0]?.name ?? ''
  return trainer.name ?? ''
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

  const now = Date.now()
  const hourMs = 60 * 60 * 1000
  const targetMs = REMINDER_HOURS * hourMs
  const windowMs = WINDOW_HOURS * hourMs
  const windowStart = new Date(now + targetMs - windowMs).toISOString()
  const windowEnd = new Date(now + targetMs + windowMs).toISOString()

  const supabase = getSupabaseAdmin()
  const { data: schedules, error } = await supabase
    .from('pt_schedules')
    .select('id, member_id, scheduled_at, trainers(name)')
    .eq('status', 'scheduled')
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  const results: Array<{
    scheduleId: string
    memberId: string
    status: string
    error?: string
  }> = []

  for (const schedule of (schedules ?? []) as ScheduleRow[]) {
    const scheduledLabel = formatScheduledAtKst(schedule.scheduled_at)
    const result = await sendMemberNotification({
      templateKey: 'pt_reminder',
      memberId: schedule.member_id,
      metadata: {
        schedule_id: schedule.id,
        scheduled_at: scheduledLabel,
        trainer_name: trainerName(schedule),
      },
    })

    results.push({
      scheduleId: schedule.id,
      memberId: schedule.member_id,
      status: result.status,
      error: result.error ?? result.skippedReason,
    })
  }

  return jsonResponse({
    ok: true,
    windowStart,
    windowEnd,
    processed: results.length,
    results,
  })
})
