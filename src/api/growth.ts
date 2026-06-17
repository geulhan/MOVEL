import type { GrowthEventType, GrowthProfile, PostGrowthEventResult } from '../types/growth'
import {
  fetchGrowthProfileRpc,
  postGrowthEventForMemberRpc,
} from './growth/growthRepository'

export type { GrowthProfile, GrowthEventType, PostGrowthEventResult }

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
  try {
    await postGrowthEventForMember({
      memberId,
      eventType: 'PT_ATTENDANCE',
      eventKey: `pt_attendance:${attendanceLogId}`,
      source,
    })
  } catch (err) {
    console.warn('성장치 적립 실패 (PT 출석):', err)
  }
}

/** 회원 운동일지 작성 시 성장 이벤트 */
export async function awardGrowthOnWorkoutLog(
  memberId: string,
  journalId: string,
  source?: string,
): Promise<void> {
  try {
    await postGrowthEventForMember({
      memberId,
      eventType: 'WORKOUT_LOG',
      eventKey: `workout_log:${journalId}`,
      source,
    })
  } catch (err) {
    console.warn('성장치 적립 실패 (운동일지):', err)
  }
}
