import { sendMemberNotification } from './notifications.ts'
import { formatScheduledAtKst } from './templates.ts'
import { getSupabaseAdmin } from './supabaseAdmin.ts'

/** 수업 시작까지 최대 이 시간 이내이면 리마인더 대상 (미발송 시 보완 발송 포함) */
export const SCHEDULE_REMINDER_HOURS = 24

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

export type ScheduleReminderRunResult = {
  windowStart: string
  windowEnd: string
  processed: number
  results: Array<{
    scheduleId: string
    memberId: string
    status: string
    error?: string
  }>
}

export async function runScheduleReminders(): Promise<ScheduleReminderRunResult> {
  const now = Date.now()
  const maxAheadMs = SCHEDULE_REMINDER_HOURS * 60 * 60 * 1000
  const windowStart = new Date(now).toISOString()
  const windowEnd = new Date(now + maxAheadMs).toISOString()

  const supabase = getSupabaseAdmin()
  const { data: schedules, error } = await supabase
    .from('pt_schedules')
    .select('id, member_id, scheduled_at, trainers(name)')
    .eq('status', 'scheduled')
    .gt('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)

  if (error) throw error

  const results: ScheduleReminderRunResult['results'] = []

  for (const schedule of (schedules ?? []) as ScheduleRow[]) {
    const scheduledLabel = formatScheduledAtKst(schedule.scheduled_at)
    const result = await sendMemberNotification({
      templateKey: 'schedule_reminder',
      memberId: schedule.member_id,
      metadata: {
        schedule_id: schedule.id,
        scheduled_at: scheduledLabel,
        schedule_date: scheduledLabel,
        trainer_name: trainerName(schedule),
        class_name: 'PT',
      },
    })

    results.push({
      scheduleId: schedule.id,
      memberId: schedule.member_id,
      status: result.status,
      error: result.error ?? result.skippedReason,
    })
  }

  return {
    windowStart,
    windowEnd,
    processed: results.length,
    results,
  }
}
