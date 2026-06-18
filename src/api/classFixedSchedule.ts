import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import {
  buildClassFixedScheduleDates,
  normalizeDaysOfWeek,
} from '../utils/fixedScheduleDates'
import type { ClassSchedule } from './classes'

export type ClassFixedSchedule = {
  id: string
  center_id: string
  class_id: string
  day_of_week: number
  days_of_week?: number[] | null
  time_of_day: string
  capacity: number | null
  weeks_ahead: number
  note: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function getClassFixedDaysOfWeek(fixed: ClassFixedSchedule): number[] {
  if (fixed.days_of_week && fixed.days_of_week.length > 0) {
    return [...fixed.days_of_week].sort((a, b) => a - b)
  }
  return [fixed.day_of_week]
}

export async function fetchClassFixedSchedules(options?: {
  classId?: string
  activeOnly?: boolean
}): Promise<ClassFixedSchedule[]> {
  const centerId = await getCurrentCenterId()
  let query = supabase
    .from('class_fixed_schedules')
    .select('*')
    .eq('center_id', centerId)
    .order('created_at', { ascending: false })

  if (options?.classId) query = query.eq('class_id', options.classId)
  if (options?.activeOnly !== false) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ClassFixedSchedule[]
}

async function insertClassScheduleRows(
  fixedId: string,
  classId: string,
  dates: Date[],
  durationMinutes: number,
  capacity: number | null,
  note: string | null,
): Promise<number> {
  if (dates.length === 0) return 0

  const centerId = await getCurrentCenterId()
  const rows = dates.map((d) => {
    const ends = new Date(d.getTime() + durationMinutes * 60 * 1000)
    return {
      center_id: centerId,
      class_id: classId,
      starts_at: d.toISOString(),
      ends_at: ends.toISOString(),
      capacity,
      note,
      status: 'scheduled' as const,
      fixed_schedule_id: fixedId,
      is_detached: false,
    }
  })

  const { error } = await supabase.from('class_schedules').insert(rows)
  if (error) throw error
  return rows.length
}

export async function createClassFixedSchedule(input: {
  class_id: string
  days_of_week: number[]
  time_of_day: string
  capacity?: number | null
  weeks_ahead?: number
  note?: string
  duration_minutes?: number
}): Promise<{ fixed: ClassFixedSchedule; createdCount: number }> {
  const days = normalizeDaysOfWeek(input.days_of_week)
  if (days.length === 0) {
    throw new Error('최소 1개 요일을 선택해 주세요.')
  }

  const centerId = await getCurrentCenterId()
  const weeksAhead = input.weeks_ahead ?? 8
  const note = input.note?.trim() || null
  const capacity = input.capacity ?? null

  const { data: cls, error: classError } = await supabase
    .from('classes')
    .select('duration_minutes')
    .eq('id', input.class_id)
    .single()

  if (classError) throw classError
  const durationMinutes = input.duration_minutes ?? Number(cls.duration_minutes) || 60

  const { data: fixedRow, error: fixedError } = await supabase
    .from('class_fixed_schedules')
    .insert({
      center_id: centerId,
      class_id: input.class_id,
      day_of_week: days[0],
      days_of_week: days,
      time_of_day: input.time_of_day,
      capacity,
      weeks_ahead: weeksAhead,
      note,
      is_active: true,
    })
    .select('*')
    .single()

  if (fixedError) throw fixedError

  const dates = buildClassFixedScheduleDates(days, input.time_of_day, weeksAhead)
  const createdCount = await insertClassScheduleRows(
    String(fixedRow.id),
    input.class_id,
    dates,
    durationMinutes,
    capacity,
    note,
  )

  return { fixed: fixedRow as ClassFixedSchedule, createdCount }
}

export async function syncClassFixedScheduleAhead(
  fixedId: string,
): Promise<number> {
  const { data: fixed, error } = await supabase
    .from('class_fixed_schedules')
    .select('*, classes(duration_minutes)')
    .eq('id', fixedId)
    .single()

  if (error) throw error

  const row = fixed as ClassFixedSchedule & {
    classes?: { duration_minutes?: number } | null
  }
  const days = getClassFixedDaysOfWeek(row)
  const durationMinutes = Number(row.classes?.duration_minutes) || 60

  const { data: existing, error: existingError } = await supabase
    .from('class_schedules')
    .select('starts_at')
    .eq('fixed_schedule_id', fixedId)
    .neq('status', 'cancelled')

  if (existingError) throw existingError

  const existingKeys = new Set(
    (existing ?? []).map((item) => new Date(String(item.starts_at)).toISOString()),
  )

  const dates = buildClassFixedScheduleDates(
    days,
    row.time_of_day,
    row.weeks_ahead,
  ).filter((d) => !existingKeys.has(d.toISOString()))

  return insertClassScheduleRows(
    fixedId,
    row.class_id,
    dates,
    durationMinutes,
    row.capacity,
    row.note,
  )
}

export async function deactivateClassFixedSchedule(fixedId: string): Promise<number> {
  const { error: fixedError } = await supabase
    .from('class_fixed_schedules')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', fixedId)

  if (fixedError) throw fixedError

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('class_schedules')
    .update({ status: 'cancelled', updated_at: nowIso })
    .eq('fixed_schedule_id', fixedId)
    .eq('status', 'scheduled')
    .gte('starts_at', nowIso)
    .select('id')

  if (error) throw error
  return (data ?? []).length
}

export type ClassTrainerSessionPayroll = {
  scheduleId: string
  trainerId: string | null
  trainerName: string
  className: string
  startsAt: string
  attendedCount: number
  grossAmount: number
}

export async function fetchMonthClassTrainerSessions(
  startIso: string,
  endIso: string,
): Promise<ClassTrainerSessionPayroll[]> {
  const centerId = await getCurrentCenterId()
  const { data: schedules, error } = await supabase
    .from('class_schedules')
    .select(
      'id, starts_at, classes(name, trainer_id, trainers(name)), class_reservations(member_id, status)',
    )
    .eq('center_id', centerId)
    .gte('starts_at', startIso)
    .lte('starts_at', endIso)
    .neq('status', 'cancelled')

  if (error) throw error

  const memberIds = new Set<string>()
  for (const row of schedules ?? []) {
    const reservations = (row.class_reservations ?? []) as Array<{
      member_id: string
      status: string
    }>
    for (const reservation of reservations) {
      if (reservation.status === 'attended') {
        memberIds.add(reservation.member_id)
      }
    }
  }

  let memberById = new Map<string, { payment_amount: number; total_sessions: number }>()
  if (memberIds.size > 0) {
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('id, payment_amount, total_sessions')
      .in('id', [...memberIds])

    if (memberError) throw memberError
    memberById = new Map(
      (members ?? []).map((member) => [
        String(member.id),
        {
          payment_amount: Number(member.payment_amount),
          total_sessions: Number(member.total_sessions),
        },
      ]),
    )
  }

  const sessions: ClassTrainerSessionPayroll[] = []

  for (const row of schedules ?? []) {
    const cls = row.classes as {
      name?: string
      trainer_id?: string | null
      trainers?: { name?: string } | null
    } | null
    const reservations = (row.class_reservations ?? []) as Array<{
      member_id: string
      status: string
    }>
    const attended = reservations.filter((item) => item.status === 'attended')
    if (attended.length === 0) continue

    let grossAmount = 0
    for (const reservation of attended) {
      const member = memberById.get(reservation.member_id)
      if (!member) continue
      const sessionsCount = member.total_sessions
      const amount = member.payment_amount
      if (sessionsCount > 0 && amount > 0) {
        grossAmount += Math.round(amount / sessionsCount)
      }
    }

    sessions.push({
      scheduleId: String(row.id),
      trainerId: cls?.trainer_id ?? null,
      trainerName: cls?.trainers?.name?.trim() || '미지정',
      className: cls?.name?.trim() || '그룹수업',
      startsAt: String(row.starts_at),
      attendedCount: attended.length,
      grossAmount,
    })
  }

  return sessions
}

export type { ClassSchedule }
