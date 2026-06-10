import { supabase } from '../lib/supabase'

export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export type PtSchedule = {
  id: string
  member_id: string
  trainer_id: string | null
  scheduled_at: string
  duration_minutes: number
  status: ScheduleStatus
  note: string | null
  created_at: string
  updated_at: string
  member_name?: string
  trainer_name?: string
}

export async function fetchSchedulesInRange(
  startIso: string,
  endIso: string,
): Promise<PtSchedule[]> {
  const { data, error } = await supabase
    .from('pt_schedules')
    .select('*')
    .gte('scheduled_at', startIso)
    .lte('scheduled_at', endIso)
    .order('scheduled_at')

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
  const payload = {
    member_id: input.member_id,
    trainer_id: input.trainer_id || null,
    scheduled_at: input.scheduled_at,
    duration_minutes: input.duration_minutes ?? 60,
    note: input.note?.trim() || null,
    status: 'scheduled' as const,
  }

  const { data, error } = await supabase
    .from('pt_schedules')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data as PtSchedule
}

export async function updateScheduleStatus(
  id: string,
  status: ScheduleStatus,
): Promise<void> {
  const { error } = await supabase
    .from('pt_schedules')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
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

  const { data, error } = await supabase
    .from('pt_schedules')
    .select('*')
    .eq('member_id', memberId)
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())
    .order('scheduled_at')

  if (error) throw error
  return (data ?? []) as PtSchedule[]
}
