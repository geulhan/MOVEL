import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isNotificationAuthorized } from '../_shared/notificationAuth.ts'
import { runPtReminders } from '../_shared/ptReminderRunner.ts'
import { runScheduleReminders } from '../_shared/scheduleReminderRunner.ts'

/**
 * 자동발송 오케스트레이터 (pg_cron → 매시 호출)
 * - PT 잔여 3회·1회
 * - 수업 24시간 이내 리마인더 (미발송 건 보완 포함)
 */
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

  const [schedule, pt] = await Promise.all([
    runScheduleReminders(),
    runPtReminders(),
  ])

  return jsonResponse({
    ok: true,
    schedule,
    pt,
    totalProcessed: schedule.processed + pt.processed,
  })
})
