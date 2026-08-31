import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import { isSameLocalDay } from '../utils/date'
import { earnGrowthOnPtSessionCompleted } from './growth/growthEarnService'
import {
  notifyScheduleCancelled,
  notifyScheduleChanged,
} from './notifications'
import { logPlatformActivity } from './platformActivity'

export const DEFAULT_PT_DURATION_MINUTES = 50

export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export type PtSchedule = {
  id: string
  center_id?: string
  member_id: string
  trainer_id: string | null
  scheduled_at: string
  duration_minutes: number
  status: ScheduleStatus
  note: string | null
  created_at: string
  updated_at: string
  fixed_schedule_id?: string | null
  is_detached?: boolean
  member_name?: string
  trainer_name?: string
}

function formatScheduleDateKst(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function buildScheduleNotificationMetadata(
  scheduleId: string,
  scheduledAt: string,
  trainerId: string | null,
): Promise<Record<string, string | number>> {
  let trainerName = '담당 트레이너'
  if (trainerId) {
    const { data: trainer } = await supabase
      .from('trainers')
      .select('name')
      .eq('id', trainerId)
      .maybeSingle()
    if (trainer?.name) trainerName = String(trainer.name)
  }

  return {
    schedule_id: scheduleId,
    scheduled_at: scheduledAt,
    schedule_date: formatScheduleDateKst(scheduledAt),
    class_name: 'PT',
    trainer_name: trainerName,
  }
}

/** 고정 수업 등 직접 UPDATE 후 예약 변경 알림 */
export async function emitScheduleChangedNotification(
  scheduleId: string,
): Promise<void> {
  const { data: schedule, error } = await supabase
    .from('pt_schedules')
    .select('member_id, scheduled_at, trainer_id, status')
    .eq('id', scheduleId)
    .single()

  if (error || !schedule?.member_id || schedule.status !== 'scheduled') return

  const metadata = await buildScheduleNotificationMetadata(
    scheduleId,
    schedule.scheduled_at,
    schedule.trainer_id,
  )
  notifyScheduleChanged(schedule.member_id, scheduleId, metadata)
}

export async function fetchSchedulesInRange(
  startIso: string,
  endIso: string,
  options?: { trainerId?: string; includeCancelled?: boolean },
): Promise<PtSchedule[]> {
  const centerId = await getCurrentCenterId()
  let query = supabase
    .from('pt_schedules')
    .select('*')
    .eq('center_id', centerId)
    .gte('scheduled_at', startIso)
    .lte('scheduled_at', endIso)
    .order('scheduled_at')

  if (!options?.includeCancelled) {
    query = query.neq('status', 'cancelled')
  }

  if (options?.trainerId) {
    query = query.eq('trainer_id', options.trainerId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as PtSchedule[]
}

export async function createSchedule(input: {
  member_id: string
  trainer_id?: string | null
  scheduled_at: string
  duration_minutes?: number
  note?: string
}): Promise<PtSchedule> {
  const centerId = await getCurrentCenterId()
  const payload = {
    center_id: centerId,
    member_id: input.member_id,
    trainer_id: input.trainer_id || null,
    scheduled_at: input.scheduled_at,
    duration_minutes: input.duration_minutes ?? DEFAULT_PT_DURATION_MINUTES,
    note: input.note?.trim() || null,
    status: 'scheduled' as const,
  }

  const { data, error } = await supabase
    .from('pt_schedules')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error

  void logPlatformActivity('schedule_created', {
    centerId,
    metadata: { schedule_id: data.id, member_id: input.member_id },
  })

  return data as PtSchedule
}

export async function updateScheduleDetails(
  id: string,
  input: {
    scheduled_at?: string
    trainer_id?: string | null
    note?: string | null
    is_detached?: boolean
  },
): Promise<void> {
  const { data: before, error: fetchError } = await supabase
    .from('pt_schedules')
    .select('member_id, scheduled_at, trainer_id, status')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const { error } = await supabase
    .from('pt_schedules')
    .update({
      ...input,
      note: input.note === undefined ? undefined : input.note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error

  const nextScheduledAt = input.scheduled_at ?? before.scheduled_at
  const nextTrainerId =
    input.trainer_id === undefined ? before.trainer_id : input.trainer_id
  const timeChanged =
    input.scheduled_at != null && input.scheduled_at !== before.scheduled_at
  const trainerChanged =
    input.trainer_id !== undefined && input.trainer_id !== before.trainer_id

  if (
    before.status === 'scheduled' &&
    before.member_id &&
    (timeChanged || trainerChanged)
  ) {
    const metadata = await buildScheduleNotificationMetadata(
      id,
      nextScheduledAt,
      nextTrainerId,
    )
    notifyScheduleChanged(before.member_id, id, metadata)
  }
}

export async function updateScheduleStatus(
  id: string,
  status: ScheduleStatus,
): Promise<void> {
  const { data: before, error: fetchError } = await supabase
    .from('pt_schedules')
    .select('member_id, status, scheduled_at, trainer_id')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const { error } = await supabase
    .from('pt_schedules')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error

  if (
    status === 'cancelled' &&
    before &&
    before.status !== 'cancelled' &&
    before.member_id
  ) {
    const metadata = await buildScheduleNotificationMetadata(
      id,
      before.scheduled_at,
      before.trainer_id,
    )
    notifyScheduleCancelled(before.member_id, id, metadata)
  }

  if (
    status === 'completed' &&
    before &&
    before.status !== 'completed' &&
    before.member_id
  ) {
    void earnGrowthOnPtSessionCompleted(String(before.member_id), id)
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('pt_schedules').delete().eq('id', id)
  if (error) throw error
}

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  scheduled: '예정',
  completed: '완료',
  cancelled: '취소',
  no_show: '노쇼',
}

export function scheduleStatusLabel(status: ScheduleStatus): string {
  return STATUS_LABELS[status]
}

/** 오늘 예정된 PT가 있는지 (시간이 지났어도 당일이면 포함) */
export function hasScheduledPtToday(
  schedules: PtSchedule[],
): boolean {
  return schedules.some(
    (s) => s.status === 'scheduled' && isSameLocalDay(s.scheduled_at),
  )
}

export function getTodayScheduledPts(
  schedules: PtSchedule[],
): PtSchedule[] {
  return schedules.filter(
    (s) => s.status === 'scheduled' && isSameLocalDay(s.scheduled_at),
  )
}

/** 트레이너 담당 오늘 PT 예약 회원 ID */
export async function fetchTodayScheduledMemberIdsForTrainer(
  trainerId: string,
): Promise<Set<string>> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('pt_schedules')
    .select('member_id')
    .eq('center_id', centerId)
    .eq('trainer_id', trainerId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())

  if (error) throw error
  return new Set(
    ((data ?? []) as { member_id: string }[]).map((row) => row.member_id),
  )
}

export async function fetchMemberSchedules(
  memberId: string,
  options?: { includePastDays?: number; futureDays?: number },
): Promise<PtSchedule[]> {
  const includePast = options?.includePastDays ?? 7
  const future = options?.futureDays ?? 60

  const start = new Date()
  start.setDate(start.getDate() - includePast)
  start.setHours(0, 0, 0, 0)

  const end = new Date()
  end.setDate(end.getDate() + future)
  end.setHours(23, 59, 59, 999)

  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('pt_schedules')
    .select('*')
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())
    .order('scheduled_at')

  if (error) throw error
  return (data ?? []) as PtSchedule[]
}
