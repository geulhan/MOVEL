import type { GrowthEventType, GrowthProfile, PostGrowthEventResult } from '../types/growth'
import { fetchGrowthProfileRpc, markGrowthNotificationsReadRpc, postGrowthEventForMemberRpc } from './growth/growthRepository'
import {
  earnGrowthOnAttendanceStreaks,
  earnGrowthOnBodyComposition,
  earnGrowthOnChallengeComplete,
  earnGrowthOnGroupClassAttendance,
  earnGrowthOnPtSessionCompleted,
  earnGrowthOnWorkoutLog,
  earnGrowthEvent,
  GrowthEventKeys,
} from './growth/growthEarnService'

export type { GrowthProfile, GrowthEventType, PostGrowthEventResult }
export {
  GrowthEventKeys,
  earnGrowthEvent,
  earnGrowthOnPtSessionCompleted,
  earnGrowthOnGroupClassAttendance,
  earnGrowthOnWorkoutLog,
  earnGrowthOnBodyComposition,
  earnGrowthOnChallengeComplete,
  earnGrowthOnAttendanceStreaks,
}

export async function getGrowthProfile(memberId: string): Promise<GrowthProfile> {
  const profile = await fetchGrowthProfileRpc(memberId)
  if (profile.unread_notification_count > 0) {
    try {
      await markGrowthNotificationsReadRpc(memberId)
    } catch {
      // 읽음 처리 실패해도 프로필 표시는 유지
    }
  }
  return profile
}

export async function postGrowthEventForMember(input: {
  memberId: string
  eventType: GrowthEventType
  eventKey: string
  source?: string
}): Promise<PostGrowthEventResult> {
  return postGrowthEventForMemberRpc(input)
}
