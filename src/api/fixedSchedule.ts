import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import { cancelAttendance } from './attendance'
import { fetchMemberById } from './memberDetail'
import {
  DEFAULT_PT_DURATION_MINUTES,
  deleteSchedule,
  emitScheduleChangedNotification,
  type PtSchedule,
  updateScheduleStatus,
} from './schedule'
import {
  buildMultiDayScheduleDatesWithTimes,
  normalizeDayTimes,
  normalizeDaysOfWeek,
  primaryTimeOfDay,
  serializeDayTimesForDb,
  type DayTimeMap,
} from '../utils/fixedScheduleDates'
import { isSameLocalDay, localDayEndIso, localDayStartIso } from '../utils/date'

export type PtFixedSchedule = {
  id: string
  center_id: string
  member_id: string
  trainer_id: string | null
  day_of_week: number
  days_of_week?: number[] | null
  time_of_day: string
  day_times?: Record<string, string> | null
  duration_minutes: number
  note: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function getFixedDaysOfWeek(fixed: PtFixedSchedule): number[] {
  if (fixed.days_of_week && fixed.days_of_week.length > 0) {
    return [...fixed.days_of_week].sort((a, b) => a - b)
  }
  return [fixed.day_of_week]
}

export function getFixedDayTimes(fixed: PtFixedSchedule): DayTimeMap {
  const days = getFixedDaysOfWeek(fixed)
  return normalizeDayTimes(days, fixed.day_times, fixed.time_of_day)
}

export async function fetchFixedSchedules(options?: {
  memberId?: string
  trainerId?: string
  activeOnly?: boolean
}): Promise<PtFixedSchedule[]> {
  const centerId = await getCurrentCenterId()
  let query = supabase
    .from('pt_fixed_schedules')
    .select('*')
    .eq('center_id', centerId)
    .order('created_at', { ascending: false })

  if (options?.memberId) query = query.eq('member_id', options.memberId)
  if (options?.trainerId) query = query.eq('trainer_id', options.trainerId)
  if (options?.activeOnly !== false) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PtFixedSchedule[]
}

async function insertScheduleRows(
  fixedId: string,
  memberId: string,
  trainerId: string | null,
  dates: Date[],
  durationMinutes: number,
  note: string | null,
): Promise<number> {
  if (dates.length === 0) return 0

  const centerId = await getCurrentCenterId()
  const rows = dates.map((d) => ({
    center_id: centerId,
    member_id: memberId,
    trainer_id: trainerId,
    scheduled_at: d.toISOString(),
    duration_minutes: durationMinutes,
    note,
    status: 'scheduled' as const,
    fixed_schedule_id: fixedId,
    is_detached: false,
  }))

  const { error } = await supabase.from('pt_schedules').insert(rows)
  if (error) throw error
  return rows.length
}

/** 고정 수업 등록 — 잔여 세션 수만큼 자동 일정 생성 (출석 시에만 차감) */
export async function createFixedSchedule(input: {
  member_id: string
  trainer_id?: string | null
  days_of_week: number[]
  time_of_day?: string
  day_times?: DayTimeMap | Record<string, string>
  duration_minutes?: number
  note?: string
}): Promise<{ fixed: PtFixedSchedule; createdCount: number }> {
  const days = normalizeDaysOfWeek(input.days_of_week)
  if (days.length === 0) {
    throw new Error('최소 1개 요일을 선택해 주세요.')
  }

  const fallbackTime = input.time_of_day?.trim() || '10:00'
  const dayTimes = normalizeDayTimes(days, input.day_times, fallbackTime)
  for (const day of days) {
    if (!dayTimes[day]) {
      throw new Error('선택한 모든 요일의 시간을 입력해 주세요.')
    }
  }

  const member = await fetchMemberById(input.member_id)
  if (member.remaining_sessions <= 0) {
    throw new Error('잔여 세션이 없습니다. 고정 수업을 등록할 수 없습니다.')
  }

  const centerId = await getCurrentCenterId()
  const duration = input.duration_minutes ?? DEFAULT_PT_DURATION_MINUTES
  const trainerId = input.trainer_id ?? member.trainer_id ?? null
  const note = input.note?.trim() || null
  const timeOfDay = primaryTimeOfDay(dayTimes)

  const { data: fixedRow, error: fixedError } = await supabase
    .from('pt_fixed_schedules')
    .insert({
      center_id: centerId,
      member_id: input.member_id,
      trainer_id: trainerId,
      day_of_week: days[0],
      days_of_week: days,
      time_of_day: timeOfDay,
      day_times: serializeDayTimesForDb(dayTimes),
      duration_minutes: duration,
      note,
      is_active: true,
    })
    .select('*')
    .single()

  if (fixedError) throw fixedError
  const fixed = fixedRow as PtFixedSchedule

  const dates = buildMultiDayScheduleDatesWithTimes(
    dayTimes,
    member.remaining_sessions,
  )

  const createdCount = await insertScheduleRows(
    fixed.id,
    input.member_id,
    trainerId,
    dates,
    duration,
    note,
  )

  if (createdCount === 0) {
    await supabase.from('pt_fixed_schedules').delete().eq('id', fixed.id)
    throw new Error('생성할 수 있는 미래 일정이 없습니다. 요일·시간을 확인해 주세요.')
  }

  return { fixed, createdCount }
}

async function fetchAttendanceOnScheduleDay(
  memberId: string,
  scheduledAt: string,
): Promise<{ id: string } | null> {
  if (!isSameLocalDay(scheduledAt)) {
    const dayStart = new Date(scheduledAt)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(scheduledAt)
    dayEnd.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('member_id', memberId)
      .gte('checked_in_at', dayStart.toISOString())
      .lte('checked_in_at', dayEnd.toISOString())
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as { id: string } | null
  }

  const { data, error } = await supabase
    .from('attendance_logs')
    .select('id')
    .eq('member_id', memberId)
    .gte('checked_in_at', localDayStartIso())
    .lte('checked_in_at', localDayEndIso())
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as { id: string } | null
}

/** 단일 일정 취소 — 해당 일 출석이 있으면 세션 복구 */
export async function cancelScheduleWithSessionRestore(
  scheduleId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('pt_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (error) throw error
  const schedule = data as PtSchedule

  const attendance = await fetchAttendanceOnScheduleDay(
    schedule.member_id,
    schedule.scheduled_at,
  )
  if (attendance) {
    await cancelAttendance(attendance.id)
  }

  await updateScheduleStatus(scheduleId, 'cancelled')
}

/** 고정 수업의 앞으로 예정된 일정 전체 취소 */
export async function cancelAllFutureFixedSchedules(
  fixedScheduleId: string,
): Promise<number> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('pt_schedules')
    .select('id, member_id, scheduled_at, status')
    .eq('fixed_schedule_id', fixedScheduleId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now)

  if (error) throw error
  const rows = (data ?? []) as Pick<
    PtSchedule,
    'id' | 'member_id' | 'scheduled_at' | 'status'
  >[]

  for (const row of rows) {
    await cancelScheduleWithSessionRestore(row.id)
  }

  await supabase
    .from('pt_fixed_schedules')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', fixedScheduleId)

  return rows.length
}

/** 개별 일정 변경 (고정에서 분리) */
export async function updateDetachedSchedule(
  scheduleId: string,
  input: {
    scheduled_at: string
    trainer_id?: string | null
    note?: string | null
  },
): Promise<void> {
  const { error } = await supabase
    .from('pt_schedules')
    .update({
      scheduled_at: input.scheduled_at,
      trainer_id: input.trainer_id ?? null,
      note: input.note?.trim() || null,
      is_detached: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)

  if (error) throw error

  void emitScheduleChangedNotification(scheduleId)
}

/** 고정 수업 전체 변경 — 분리되지 않은 미래 일정 일괄 반영 */
export async function updateFixedScheduleSeries(
  fixedScheduleId: string,
  input: {
    days_of_week: number[]
    time_of_day?: string
    day_times?: DayTimeMap | Record<string, string>
    trainer_id?: string | null
    note?: string | null
  },
): Promise<number> {
  const days = normalizeDaysOfWeek(input.days_of_week)
  if (days.length === 0) {
    throw new Error('최소 1개 요일을 선택해 주세요.')
  }

  const fallbackTime = input.time_of_day?.trim() || '10:00'
  const dayTimes = normalizeDayTimes(days, input.day_times, fallbackTime)
  const timeOfDay = primaryTimeOfDay(dayTimes)

  const now = new Date().toISOString()

  const { error: fixedError } = await supabase
    .from('pt_fixed_schedules')
    .update({
      day_of_week: days[0],
      days_of_week: days,
      time_of_day: timeOfDay,
      day_times: serializeDayTimesForDb(dayTimes),
      trainer_id: input.trainer_id ?? null,
      note: input.note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fixedScheduleId)

  if (fixedError) throw fixedError

  const { data, error } = await supabase
    .from('pt_schedules')
    .select('id')
    .eq('fixed_schedule_id', fixedScheduleId)
    .eq('is_detached', false)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now)

  if (error) throw error
  const ids = ((data ?? []) as { id: string }[]).map((r) => r.id)

  const { data: fixedRow, error: fetchFixedError } = await supabase
    .from('pt_fixed_schedules')
    .select('member_id, duration_minutes, note')
    .eq('id', fixedScheduleId)
    .single()

  if (fetchFixedError) throw fetchFixedError
  const fixed = fixedRow as {
    member_id: string
    duration_minutes: number
    note: string | null
  }

  const newDates = buildMultiDayScheduleDatesWithTimes(dayTimes, ids.length)

  await Promise.all(
    ids.map(async (id, index) => {
      const at = newDates[index]
      if (!at) {
        await updateScheduleStatus(id, 'cancelled')
        return
      }
      const { error: updError } = await supabase
        .from('pt_schedules')
        .update({
          scheduled_at: at.toISOString(),
          trainer_id: input.trainer_id ?? null,
          note: input.note?.trim() ?? fixed.note,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (updError) throw updError
      void emitScheduleChangedNotification(id)
    }),
  )

  return ids.length
}

/** 잔여 세션에 맞춰 고정 수업 미래 일정 보충 */
export async function syncFixedScheduleToRemaining(
  fixedScheduleId: string,
): Promise<number> {
  const { data: fixedRow, error: fixedError } = await supabase
    .from('pt_fixed_schedules')
    .select('*')
    .eq('id', fixedScheduleId)
    .single()

  if (fixedError) throw fixedError
  const fixed = fixedRow as PtFixedSchedule
  if (!fixed.is_active) {
    throw new Error('비활성 고정 수업은 동기화할 수 없습니다.')
  }

  const member = await fetchMemberById(fixed.member_id)
  const now = new Date().toISOString()

  const { count, error: countError } = await supabase
    .from('pt_schedules')
    .select('id', { count: 'exact', head: true })
    .eq('fixed_schedule_id', fixedScheduleId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now)

  if (countError) throw countError
  const existing = count ?? 0
  const needed = member.remaining_sessions - existing

  if (needed <= 0) return 0

  const dayTimes = getFixedDayTimes(fixed)
  const dates = buildMultiDayScheduleDatesWithTimes(dayTimes, needed)

  return insertScheduleRows(
    fixed.id,
    fixed.member_id,
    fixed.trainer_id,
    dates,
    fixed.duration_minutes,
    fixed.note,
  )
}

export async function deleteScheduleAdmin(scheduleId: string): Promise<void> {
  const { data, error } = await supabase
    .from('pt_schedules')
    .select('member_id, scheduled_at, status')
    .eq('id', scheduleId)
    .single()

  if (error) throw error
  const schedule = data as Pick<
    PtSchedule,
    'member_id' | 'scheduled_at' | 'status'
  >

  if (schedule.status === 'completed') {
    const attendance = await fetchAttendanceOnScheduleDay(
      schedule.member_id,
      schedule.scheduled_at,
    )
    if (attendance) {
      await cancelAttendance(attendance.id)
    }
  }

  await deleteSchedule(scheduleId)
}
