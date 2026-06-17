import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import { isSameLocalDay } from '../utils/date'
import { earnGrowthOnPtSessionCompleted } from './growth/growthEarnService'
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

export async function fetchSchedulesInRange(
  startIso: string,
  endIso: string,
  options?: { trainerId?: string },
): Promise<PtSchedule[]> {
  const centerId = await getCurrentCenterId()
  let query = supabase
    .from('pt_schedules')
    .select('*')
    .eq('center_id', centerId)
    .gte('scheduled_at', startIso)
    .lte('scheduled_at', endIso)
    .order('scheduled_at')

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
  const { error } = await supabase
    .from('pt_schedules')
    .update({
      ...input,
      note: input.note === undefined ? undefined : input.note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

export async function updateScheduleStatus(
  id: string,
  status: ScheduleStatus,
): Promise<void> {
  const { data: before, error: fetchError } = await supabase
    .from('pt_schedules')
    .select('member_id, status')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const { error } = await supabase
    .from('pt_schedules')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error

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
