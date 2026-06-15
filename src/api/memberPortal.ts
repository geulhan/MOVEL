import {
  getPersistedItem,
  removePersistedItem,
  setPersistedItem,
} from '../lib/browserStorage'
import { resolveCenterIdForMember } from '../lib/center'
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
  const centerId = await resolveCenterIdForMember()
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('center_id', centerId)
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
  const centerId = await resolveCenterIdForMember(memberId)
  return fetchTodayAttendanceForMember(memberId, centerId)
}

export async function checkIn(memberId: string): Promise<AttendanceLog> {
  const result = await checkInMember(memberId, 'self')
  return result.attendance
}

export async function fetchRecentAttendance(
  memberId: string,
  limit = 10,
): Promise<AttendanceLog[]> {
  const centerId = await resolveCenterIdForMember(memberId)
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('member_id', memberId)
    .eq('center_id', centerId)
    .order('checked_in_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

const SESSION_KEY = 'mobel_member_id'
const TOKEN_KEY = 'mobel_member_token'
const CENTER_SLUG_KEY = 'mobel_member_center_slug'
const CENTER_ID_KEY = 'mobel_member_center_id'

export function saveMemberSession(
  memberId: string,
  token?: string,
  centerSlug?: string,
  centerId?: string,
): void {
  setPersistedItem(SESSION_KEY, memberId)
  if (token) {
    setPersistedItem(TOKEN_KEY, token)
  }
  if (centerSlug) {
    setPersistedItem(CENTER_SLUG_KEY, centerSlug)
  }
  if (centerId) {
    setPersistedItem(CENTER_ID_KEY, centerId)
  }
}

export function getMemberSession(): string | null {
  return getPersistedItem(SESSION_KEY)
}

export function getMemberAuthToken(): string | null {
  return getPersistedItem(TOKEN_KEY)
}

export function getMemberCenterSlug(): string | null {
  return getPersistedItem(CENTER_SLUG_KEY)
}

export function getMemberCenterId(): string | null {
  return getPersistedItem(CENTER_ID_KEY)
}

export function clearMemberSession(): void {
  removePersistedItem(SESSION_KEY)
  removePersistedItem(TOKEN_KEY)
  removePersistedItem(CENTER_SLUG_KEY)
  removePersistedItem(CENTER_ID_KEY)
}
