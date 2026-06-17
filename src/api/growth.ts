import { resolveCenterIdForMember } from '../lib/center'
import { supabase } from '../lib/supabase'
import { localDayStartIso } from '../utils/date'
import type { GrowthEventType, GrowthProfile, PostGrowthEventResult } from '../types/growth'
import {
  fetchGrowthProfileRpc,
  postGrowthEventForMemberRpc,
} from './growth/growthRepository'

export type { GrowthProfile, GrowthEventType, PostGrowthEventResult }

async function postGrowthEventSafe(input: {
  memberId: string
  eventType: GrowthEventType
  eventKey?: string
  source?: string
  logLabel: string
}): Promise<void> {
  try {
    await postGrowthEventForMemberRpc(input)
  } catch (err) {
    console.warn(`성장치 적립 실패 (${input.logLabel}):`, err)
  }
}

export async function getGrowthProfile(memberId: string): Promise<GrowthProfile> {
  return fetchGrowthProfileRpc(memberId)
}

export async function postGrowthEventForMember(input: {
  memberId: string
  eventType: GrowthEventType
  eventKey?: string
  source?: string
}): Promise<PostGrowthEventResult> {
  return postGrowthEventForMemberRpc(input)
}

/** PT 출석 완료 시 성장 이벤트 */
export async function awardGrowthOnPtAttendance(
  memberId: string,
  attendanceLogId: string,
  source?: string,
): Promise<void> {
  await postGrowthEventSafe({
    memberId,
    eventType: 'PT_ATTENDANCE',
    eventKey: `pt_attendance:${attendanceLogId}`,
    source,
    logLabel: 'PT 출석',
  })
  await awardGrowthOnAttendanceStreaks(memberId, source)
}

/** 그룹수업 출석 시 성장 이벤트 */
export async function awardGrowthOnGroupClassAttendance(
  memberId: string,
  classAttendanceId: string,
  source?: string,
): Promise<void> {
  await postGrowthEventSafe({
    memberId,
    eventType: 'GROUP_CLASS_ATTENDANCE',
    eventKey: `group_class:${classAttendanceId}`,
    source,
    logLabel: '그룹수업 출석',
  })
  await awardGrowthOnAttendanceStreaks(memberId, source)
}

/** 회원 운동일지 작성 시 성장 이벤트 */
export async function awardGrowthOnWorkoutLog(
  memberId: string,
  journalId: string,
  hasPhotos: boolean,
  source?: string,
): Promise<void> {
  await postGrowthEventSafe({
    memberId,
    eventType: hasPhotos ? 'PHOTO_WORKOUT_LOG' : 'WORKOUT_LOG',
    eventKey: `workout_log:${journalId}`,
    source,
    logLabel: hasPhotos ? '사진 운동일지' : '운동일지',
  })
}

/** 체성분 측정 기록 시 성장 이벤트 (월 1회, RPC에서 제한) */
export async function awardGrowthOnBodyComposition(
  memberId: string,
  recordId: string,
  source?: string,
): Promise<void> {
  await postGrowthEventSafe({
    memberId,
    eventType: 'BODY_COMPOSITION',
    eventKey: `body_composition:${recordId}`,
    source,
    logLabel: '체성분 측정',
  })
}

/** 센터 챌린지 완료 시 성장 이벤트 */
export async function awardGrowthOnChallengeComplete(
  memberId: string,
  challengeId: string,
  source?: string,
): Promise<void> {
  await postGrowthEventSafe({
    memberId,
    eventType: 'CHALLENGE_COMPLETE',
    eventKey: `challenge:${challengeId}`,
    source,
    logLabel: '센터 챌린지',
  })
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10)
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function computeConsecutiveAttendanceDays(dateKeys: Set<string>): number {
  const today = toDateKey(new Date().toISOString())
  if (!dateKeys.has(today)) return 0

  let streak = 0
  let cursor = today
  while (dateKeys.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** PT·그룹수업 출석일 기준 연속 출석 보너스 */
export async function awardGrowthOnAttendanceStreaks(
  memberId: string,
  source?: string,
): Promise<void> {
  try {
    const centerId = await resolveCenterIdForMember(memberId)
    const since = addDays(toDateKey(localDayStartIso()), -35)

    const [ptRes, classRes] = await Promise.all([
      supabase
        .from('attendance_logs')
        .select('checked_in_at')
        .eq('member_id', memberId)
        .eq('center_id', centerId)
        .gte('checked_in_at', `${since}T00:00:00`),
      supabase
        .from('class_attendance')
        .select('checked_at')
        .eq('member_id', memberId)
        .eq('center_id', centerId)
        .eq('status', 'attended')
        .gte('checked_at', `${since}T00:00:00`),
    ])

    if (ptRes.error) throw ptRes.error
    if (classRes.error) throw classRes.error

    const dateKeys = new Set<string>()
    for (const row of ptRes.data ?? []) {
      dateKeys.add(toDateKey(String(row.checked_in_at)))
    }
    for (const row of classRes.data ?? []) {
      dateKeys.add(toDateKey(String(row.checked_at)))
    }

    const streak = computeConsecutiveAttendanceDays(dateKeys)
    const today = toDateKey(new Date().toISOString())

    if (streak === 30) {
      await postGrowthEventSafe({
        memberId,
        eventType: 'STREAK_30_DAYS',
        eventKey: `attendance_streak:30:${today}`,
        source,
        logLabel: '30일 연속 출석',
      })
    } else if (streak === 7) {
      await postGrowthEventSafe({
        memberId,
        eventType: 'STREAK_7_DAYS',
        eventKey: `attendance_streak:7:${today}`,
        source,
        logLabel: '7일 연속 출석',
      })
    }
  } catch (err) {
    console.warn('연속 출석 성장치 적립 실패:', err)
  }
}
