import { supabase } from '../lib/supabase'
import type { Member } from '../types/database'
import { awardPtAttendance, reversePtAttendance } from './rewards'
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

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function fetchTodayAttendanceForMember(
  memberId: string,
): Promise<AttendanceRow | null> {
  const today = todayDateString()
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('id, member_id, checked_in_at, method')
    .eq('member_id', memberId)
    .gte('checked_in_at', `${today}T00:00:00`)
    .lte('checked_in_at', `${today}T23:59:59`)
    .maybeSingle()

  if (error) throw error
  return data as AttendanceRow | null
}

export async function fetchTodayCheckedInMemberIds(): Promise<Set<string>> {
  const today = todayDateString()
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('member_id')
    .gte('checked_in_at', `${today}T00:00:00`)
    .lte('checked_in_at', `${today}T23:59:59`)

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

  const { data, error } = await supabase
    .from('attendance_logs')
    .insert({ member_id: memberId, method })
    .select('id, member_id, checked_in_at, method')
    .single()

  if (error) throw error

  const attendance = data as AttendanceRow
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
  let query = supabase
    .from('attendance_logs')
    .select('id, member_id, checked_in_at, method')
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
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('id, checked_in_at, method')
    .eq('member_id', memberId)
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
