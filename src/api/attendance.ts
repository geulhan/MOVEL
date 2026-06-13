import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import type { Member } from '../types/database'
import { localDayEndIso, localDayStartIso } from '../utils/date'
import { awardPtAttendance, reversePtAttendance } from './rewards'
import {
  fetchMemberSchedules,
  fetchSchedulesInRange,
  getTodayScheduledPts,
  scheduleStatusLabel,
  updateScheduleStatus,
  type PtSchedule,
  type ScheduleStatus,
} from './schedule'
import { deductSession, fetchMembers, restoreOneSession } from './members'

export type AttendanceMethod = 'self' | 'admin' | 'trainer'

export type AttendanceRecord = {
  id: string
  member_id: string
  member_name: string
  checked_in_at: string
  method: string
}

type AttendanceRow = {
  id: string
  member_id: string
  checked_in_at: string
  method: string
}

export async function fetchTodayAttendanceForMember(
  memberId: string,
): Promise<AttendanceRow | null> {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('id, member_id, checked_in_at, method')
    .eq('member_id', memberId)
    .gte('checked_in_at', localDayStartIso())
    .lte('checked_in_at', localDayEndIso())
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as AttendanceRow | null
}

export async function fetchTodayCheckedInMemberIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('member_id')
    .gte('checked_in_at', localDayStartIso())
    .lte('checked_in_at', localDayEndIso())

  if (error) throw error

  return new Set(
    ((data ?? []) as { member_id: string }[]).map((row) => row.member_id),
  )
}

export type CheckInResult = {
  member: Member
  attendance: AttendanceRow
}

/** 출석 처리 + PT 1회 차감 */
export async function checkInMember(
  memberId: string,
  method: AttendanceMethod = 'admin',
): Promise<CheckInResult> {
  const existing = await fetchTodayAttendanceForMember(memberId)
  if (existing) {
    throw new Error('오늘은 이미 출석 처리되었습니다.')
  }

  const member = await deductSession(memberId)

  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('attendance_logs')
    .insert({ center_id: centerId, member_id: memberId, method })
    .select('id, member_id, checked_in_at, method')
    .single()

  if (error) throw error

  const attendance = data as AttendanceRow

  try {
    const schedules = await fetchMemberSchedules(memberId, {
      includePastDays: 0,
      futureDays: 1,
    })
    const todaySchedules = getTodayScheduledPts(schedules)
    await Promise.all(
      todaySchedules.map((s) => updateScheduleStatus(s.id, 'completed')),
    )
  } catch (scheduleErr) {
    console.warn('스케줄 완료 처리 실패:', scheduleErr)
  }

  try {
    await awardPtAttendance(memberId, attendance.id)
  } catch (rewardErr) {
    console.warn('리워드 적립 실패:', rewardErr)
  }

  return { member, attendance }
}


/** 관리자 전용: 출석 취소 + PT 1회 복구 */
export async function cancelAttendance(recordId: string): Promise<Member> {
  const { data: att, error: fetchError } = await supabase
    .from('attendance_logs')
    .select('id, member_id, checked_in_at, method')
    .eq('id', recordId)
    .single()

  if (fetchError) throw fetchError
  const attendance = att as AttendanceRow
  const checkedAt = new Date(attendance.checked_in_at).getTime()

  const { data: logs, error: logsError } = await supabase
    .from('session_logs')
    .select('id, deducted_at')
    .eq('member_id', attendance.member_id)
    .order('deducted_at', { ascending: false })
    .limit(10)

  if (logsError) throw logsError

  const matched = ((logs ?? []) as { id: string; deducted_at: string }[]).find(
    (log) =>
      Math.abs(new Date(log.deducted_at).getTime() - checkedAt) <
      10 * 60 * 1000,
  )

  if (matched) {
    const { error: delLogError } = await supabase
      .from('session_logs')
      .delete()
      .eq('id', matched.id)
    if (delLogError) throw delLogError
  }

  const { error: delAttError } = await supabase
    .from('attendance_logs')
    .delete()
    .eq('id', recordId)

  if (delAttError) throw delAttError

  try {
    await reversePtAttendance(attendance.member_id, attendance.id)
  } catch (rewardErr) {
    console.warn('리워드 회수 실패:', rewardErr)
  }

  return restoreOneSession(attendance.member_id)
}

export async function fetchAttendanceRecords(
  fromDate?: string,
  toDate?: string,
): Promise<AttendanceRecord[]> {
  const centerId = await getCurrentCenterId()
  let query = supabase
    .from('attendance_logs')
    .select('id, member_id, checked_in_at, method')
    .eq('center_id', centerId)
    .order('checked_in_at', { ascending: false })
    .limit(200)

  if (fromDate) {
    query = query.gte('checked_in_at', `${fromDate}T00:00:00`)
  }
  if (toDate) {
    query = query.lte('checked_in_at', `${toDate}T23:59:59`)
  }

  const { data, error } = await query
  if (error) throw error

  const members = await fetchMembers()
  const nameById = new Map(members.map((m) => [m.id, m.name]))

  return ((data ?? []) as AttendanceRow[]).map((row) => ({
    id: row.id,
    member_id: row.member_id,
    member_name: nameById.get(row.member_id) ?? '-',
    checked_in_at: row.checked_in_at,
    method: row.method,
  }))
}

export type MemberAttendanceRow = {
  id: string
  checked_in_at: string
  method: string
  trainer_name: string
  deducted: boolean
}

export async function fetchMemberAttendance(
  memberId: string,
  trainerName: string | null,
): Promise<MemberAttendanceRow[]> {
  const centerId = await getCurrentCenterId()
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('id, checked_in_at, method')
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .order('checked_in_at', { ascending: false })
    .limit(50)

  if (error) throw error

  const trainer = trainerName ?? '미지정'

  return ((data ?? []) as AttendanceRow[]).map((row) => ({
    id: row.id,
    checked_in_at: row.checked_in_at,
    method: row.method,
    trainer_name: trainer,
    deducted: true,
  }))
}

export type CenterAttendanceDisplayStatus =
  | 'attended'
  | 'no_show'
  | 'scheduled'
  | 'absent'
  | 'walk_in'

export type CenterAttendanceRow = {
  key: string
  memberId: string
  memberName: string
  trainerName: string | null
  scheduleId: string | null
  scheduledAt: string | null
  scheduleStatus: ScheduleStatus | null
  displayStatus: CenterAttendanceDisplayStatus
  checkedInAt: string | null
  attendanceId: string | null
  method: string | null
}

export type CenterAttendanceSummary = {
  /** 오늘 출석(예약·예약없음 포함) */
  attendedToday: number
  /** 선택 월 예약됐으나 출석 미처리 */
  monthScheduled: number
  /** 오늘 예약 있으나 미출석 */
  absentToday: number
  /** 오늘 노쇼 */
  noShowToday: number
  /** 선택 월 총 출석 횟수 */
  monthAttendanceTotal: number
}

export type MonthRef = {
  year: number
  month: number
}

export function monthRangeIso({ year, month }: MonthRef): {
  startIso: string
  endIso: string
} {
  const start = new Date(year, month - 1, 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(year, month, 0)
  end.setHours(23, 59, 59, 999)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

export function formatMonthLabel({ year, month }: MonthRef): string {
  return new Date(year, month - 1, 1).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  })
}

const DISPLAY_STATUS_LABELS: Record<CenterAttendanceDisplayStatus, string> = {
  attended: '출석',
  no_show: '노쇼',
  scheduled: '예정',
  absent: '미출석',
  walk_in: '출석',
}

export function centerAttendanceStatusLabel(
  status: CenterAttendanceDisplayStatus,
): string {
  return DISPLAY_STATUS_LABELS[status]
}

function isSchedulePast(scheduledAt: string): boolean {
  return new Date(scheduledAt).getTime() < Date.now()
}

function deriveDisplayStatus(input: {
  attended: boolean
  scheduleStatus: ScheduleStatus | null
  scheduledAt: string | null
  hasSchedule: boolean
}): CenterAttendanceDisplayStatus {
  if (input.attended && !input.hasSchedule) return 'walk_in'
  if (input.attended) return 'attended'
  if (input.scheduleStatus === 'no_show') return 'no_show'
  if (input.scheduleStatus === 'scheduled' && input.scheduledAt) {
    return isSchedulePast(input.scheduledAt) ? 'absent' : 'scheduled'
  }
  if (input.scheduleStatus === 'completed' && !input.attended) return 'absent'
  return 'scheduled'
}

export async function fetchMonthAttendanceTotal(
  monthRef: MonthRef,
): Promise<number> {
  const centerId = await getCurrentCenterId()
  const { startIso, endIso } = monthRangeIso(monthRef)
  const { count, error } = await supabase
    .from('attendance_logs')
    .select('id', { count: 'exact', head: true })
    .eq('center_id', centerId)
    .gte('checked_in_at', startIso)
    .lte('checked_in_at', endIso)

  if (error) throw error
  return count ?? 0
}

/** 선택 월: 예약됐으나 출석 처리되지 않은 수업 */
export async function fetchMonthScheduledPending(
  monthRef: MonthRef,
): Promise<CenterAttendanceRow[]> {
  const { startIso, endIso } = monthRangeIso(monthRef)
  const [schedules, members] = await Promise.all([
    fetchSchedulesInRange(startIso, endIso),
    fetchMembers(),
  ])

  const nameById = new Map(members.map((m) => [m.id, m.name]))
  const trainerByMemberId = new Map(
    members.map((m) => [m.id, m.trainer_name ?? null]),
  )

  const rows = (schedules as PtSchedule[])
    .filter((s) => s.status === 'scheduled')
    .map((schedule) => ({
      key: `month-schedule-${schedule.id}`,
      memberId: schedule.member_id,
      memberName:
        schedule.member_name ?? nameById.get(schedule.member_id) ?? '회원',
      trainerName:
        schedule.trainer_name ??
        trainerByMemberId.get(schedule.member_id) ??
        null,
      scheduleId: schedule.id,
      scheduledAt: schedule.scheduled_at,
      scheduleStatus: schedule.status,
      displayStatus: 'scheduled' as const,
      checkedInAt: null,
      attendanceId: null,
      method: null,
    }))

  rows.sort((a, b) => {
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
    if (aTime !== bTime) return aTime - bTime
    return a.memberName.localeCompare(b.memberName, 'ko')
  })

  return rows
}

/** 오늘 센터 전체 PT 예약·출석·노쇼 현황 */
export async function fetchTodayCenterAttendanceBoard(): Promise<{
  rows: CenterAttendanceRow[]
  summary: Omit<
    CenterAttendanceSummary,
    'monthScheduled' | 'monthAttendanceTotal'
  >
}> {
  const start = localDayStartIso()
  const end = localDayEndIso()

  const [schedules, attendanceRows, members] = await Promise.all([
    fetchSchedulesInRange(start, end),
    fetchAttendanceRecords(),
    fetchMembers(),
  ])

  const nameById = new Map(members.map((m) => [m.id, m.name]))
  const trainerByMemberId = new Map(
    members.map((m) => [m.id, m.trainer_name ?? null]),
  )

  const todayAttendance = attendanceRows.filter((row) => {
    const checked = row.checked_in_at
    return checked >= start && checked <= end
  })

  const attendanceByMember = new Map<string, AttendanceRecord>()
  for (const row of todayAttendance) {
    if (!attendanceByMember.has(row.member_id)) {
      attendanceByMember.set(row.member_id, row)
    }
  }

  const activeSchedules = (schedules as PtSchedule[]).filter(
    (s) => s.status !== 'cancelled',
  )

  const rows: CenterAttendanceRow[] = activeSchedules.map((schedule) => {
    const attendance = attendanceByMember.get(schedule.member_id) ?? null
    const attended = Boolean(attendance)
  const displayStatus = deriveDisplayStatus({
      attended,
      scheduleStatus: schedule.status,
      scheduledAt: schedule.scheduled_at,
      hasSchedule: true,
    })

    return {
      key: `schedule-${schedule.id}`,
      memberId: schedule.member_id,
      memberName:
        schedule.member_name ?? nameById.get(schedule.member_id) ?? '회원',
      trainerName:
        schedule.trainer_name ?? trainerByMemberId.get(schedule.member_id) ?? null,
      scheduleId: schedule.id,
      scheduledAt: schedule.scheduled_at,
      scheduleStatus: schedule.status,
      displayStatus,
      checkedInAt: attendance?.checked_in_at ?? null,
      attendanceId: attendance?.id ?? null,
      method: attendance?.method ?? null,
    }
  })

  for (const [memberId, attendance] of attendanceByMember.entries()) {
    const hasScheduleRow = rows.some((row) => row.memberId === memberId)
    if (hasScheduleRow) continue

    rows.push({
      key: `walkin-${attendance.id}`,
      memberId,
      memberName: attendance.member_name,
      trainerName: trainerByMemberId.get(memberId) ?? null,
      scheduleId: null,
      scheduledAt: null,
      scheduleStatus: null,
      displayStatus: 'walk_in',
      checkedInAt: attendance.checked_in_at,
      attendanceId: attendance.id,
      method: attendance.method,
    })
  }

  rows.sort((a, b) => {
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
    if (aTime !== bTime) return aTime - bTime
    return a.memberName.localeCompare(b.memberName, 'ko')
  })

  const summary = {
    attendedToday: rows.filter(
      (r) => r.displayStatus === 'attended' || r.displayStatus === 'walk_in',
    ).length,
    absentToday: rows.filter((r) => r.displayStatus === 'absent').length,
    noShowToday: rows.filter((r) => r.displayStatus === 'no_show').length,
  }

  return { rows, summary }
}

export async function fetchCenterAttendanceBoard(monthRef: MonthRef): Promise<{
  todayRows: CenterAttendanceRow[]
  monthScheduledRows: CenterAttendanceRow[]
  summary: CenterAttendanceSummary
}> {
  const [today, monthScheduledRows, monthAttendanceTotal] = await Promise.all([
    fetchTodayCenterAttendanceBoard(),
    fetchMonthScheduledPending(monthRef),
    fetchMonthAttendanceTotal(monthRef),
  ])

  return {
    todayRows: today.rows,
    monthScheduledRows,
    summary: {
      ...today.summary,
      monthScheduled: monthScheduledRows.length,
      monthAttendanceTotal,
    },
  }
}

export { scheduleStatusLabel }

export function attendanceMethodLabel(method: string): string {
  switch (method) {
    case 'self':
      return '회원 셀프'
    case 'admin':
      return '관리자'
    case 'trainer':
      return '트레이너'
    default:
      return method
  }
}
