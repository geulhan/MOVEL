import { resolveCenterIdForMember } from '../../lib/center'
import { supabase } from '../../lib/supabase'
import { localDayStartIso } from '../../utils/date'
import { STEP_GROWTH_TIERS } from '../../constants/growth'
import type { GrowthEventType, PostGrowthEventResult } from '../../types/growth'
import { postGrowthEventForMemberRpc } from './growthRepository'

/** 전역 UNIQUE event_key 생성 */
export const GrowthEventKeys = {
  ptSession: (scheduleId: string) => `PT_SESSION_${scheduleId}`,
  groupClass: (attendanceId: string) => `GROUP_CLASS_${attendanceId}`,
  workoutLog: (journalId: string) => `WORKOUT_LOG_${journalId}`,
  bodyScan: (recordId: string) => `BODY_SCAN_${recordId}`,
  challenge: (challengeId: string) => `CHALLENGE_${challengeId}`,
  streak7: (endDate: string) => `STREAK_7_${endDate}`,
  streak30: (endDate: string) => `STREAK_30_${endDate}`,
  steps: (eventType: string, memberId: string, date: string) =>
    `${eventType}_${memberId}_${date}`,
} as const

export type EarnGrowthInput = {
  memberId: string
  eventType: GrowthEventType
  eventKey: string
  source?: string
}

/**
 * MotionHub 행동 → 성장 자동 적립
 * post_growth_event RPC + growth_events.event_key UNIQUE 중복 방지
 */
export async function earnGrowthEvent(
  input: EarnGrowthInput,
): Promise<PostGrowthEventResult | null> {
  try {
    const result = await postGrowthEventForMemberRpc({
      memberId: input.memberId,
      eventType: input.eventType,
      eventKey: input.eventKey,
      source: input.source,
    })
    return result
  } catch (err) {
    console.warn(
      `성장 자동 적립 실패 (${input.eventType} / ${input.eventKey}):`,
      err,
    )
    return null
  }
}

/** 걸음 OCR 인증 승인 시 구간별 성장치·도토리 (마일리지와 별도) */
export async function earnGrowthOnStepVerification(
  memberId: string,
  stepCount: number,
  date: string,
  source = 'step_verification',
): Promise<void> {
  for (const tier of STEP_GROWTH_TIERS) {
    if (stepCount < tier.min) continue
    await earnGrowthEvent({
      memberId,
      eventType: tier.eventType,
      eventKey: GrowthEventKeys.steps(tier.eventType, memberId, date),
      source,
    })
  }
}

/** PT 세션 completed 시 */
export async function earnGrowthOnPtSessionCompleted(
  memberId: string,
  scheduleId: string,
  source = 'pt_schedule',
): Promise<PostGrowthEventResult | null> {
  const result = await earnGrowthEvent({
    memberId,
    eventType: 'PT_ATTENDANCE',
    eventKey: GrowthEventKeys.ptSession(scheduleId),
    source,
  })

  if (result && !result.duplicate) {
    await earnGrowthOnAttendanceStreaks(memberId, source)
  }

  return result
}

/** 그룹수업 예약 attended 시 */
export async function earnGrowthOnGroupClassAttendance(
  memberId: string,
  classAttendanceId: string,
  source = 'class_attendance',
): Promise<PostGrowthEventResult | null> {
  const result = await earnGrowthEvent({
    memberId,
    eventType: 'GROUP_CLASS_ATTENDANCE',
    eventKey: GrowthEventKeys.groupClass(classAttendanceId),
    source,
  })

  if (result && !result.duplicate) {
    await earnGrowthOnAttendanceStreaks(memberId, source)
  }

  return result
}

/** 운동일지 생성 시 (사진 유무에 따라 보상 분기) */
export async function earnGrowthOnWorkoutLog(
  memberId: string,
  journalId: string,
  hasPhotos: boolean,
  source = 'exercise_journal',
): Promise<PostGrowthEventResult | null> {
  return earnGrowthEvent({
    memberId,
    eventType: hasPhotos ? 'PHOTO_WORKOUT_LOG' : 'WORKOUT_LOG',
    eventKey: GrowthEventKeys.workoutLog(journalId),
    source,
  })
}

/** 체성분 측정 기록 시 (30일 1회, RPC 제한) */
export async function earnGrowthOnBodyComposition(
  memberId: string,
  recordId: string,
  source = 'inbody_record',
): Promise<PostGrowthEventResult | null> {
  return earnGrowthEvent({
    memberId,
    eventType: 'BODY_COMPOSITION',
    eventKey: GrowthEventKeys.bodyScan(recordId),
    source,
  })
}

/** @deprecated 센터 챌린지 보상은 DB `sync_center_challenges_for_member`가 자동 지급합니다. */
export async function earnGrowthOnChallengeComplete(
  memberId: string,
  challengeId: string,
  source = 'challenge',
): Promise<PostGrowthEventResult | null> {
  return earnGrowthEvent({
    memberId,
    eventType: 'CHALLENGE_COMPLETE',
    eventKey: GrowthEventKeys.challenge(challengeId),
    source,
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
export async function earnGrowthOnAttendanceStreaks(
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
      await earnGrowthEvent({
        memberId,
        eventType: 'STREAK_30_DAYS',
        eventKey: GrowthEventKeys.streak30(today),
        source,
      })
    } else if (streak === 7) {
      await earnGrowthEvent({
        memberId,
        eventType: 'STREAK_7_DAYS',
        eventKey: GrowthEventKeys.streak7(today),
        source,
      })
    }
  } catch (err) {
    console.warn('연속 출석 성장치 적립 실패:', err)
  }
}
