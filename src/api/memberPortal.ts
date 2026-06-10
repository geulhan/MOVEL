import { normalizeMember } from '../lib/memberNormalize'
import { supabase } from '../lib/supabase'
import type { Member } from '../types/database'
import {
  checkInMember,
  fetchTodayAttendanceForMember,
} from './attendance'
import {
  fetchExerciseJournals,
  type ExerciseJournal,
} from './exerciseJournals'
import { normalizePhone } from './members'

export type { ExerciseJournal }

export type AttendanceLog = {
  id: string
  member_id: string
  checked_in_at: string
  method: string
}

export async function findMemberByPhone(phone: string): Promise<Member | null> {
  const digits = normalizePhone(phone)
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('phone', digits)
    .maybeSingle()

  if (error) throw error
  return data ? normalizeMember(data) : null
}

export async function fetchJournals(memberId: string): Promise<ExerciseJournal[]> {
  return fetchExerciseJournals(memberId)
}

export async function fetchTodayAttendance(
  memberId: string,
): Promise<AttendanceLog | null> {
  return fetchTodayAttendanceForMember(memberId)
}

export async function checkIn(memberId: string): Promise<AttendanceLog> {
  const result = await checkInMember(memberId, 'self')
  return result.attendance
}

export async function fetchRecentAttendance(
  memberId: string,
  limit = 10,
): Promise<AttendanceLog[]> {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('member_id', memberId)
    .order('checked_in_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

const SESSION_KEY = 'mobel_member_id'

export function saveMemberSession(memberId: string): void {
  sessionStorage.setItem(SESSION_KEY, memberId)
}

export function getMemberSession(): string | null {
  return sessionStorage.getItem(SESSION_KEY)
}

export function clearMemberSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
