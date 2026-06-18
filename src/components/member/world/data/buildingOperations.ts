import type { WorldBuildingKey } from './worldLayout'

export type BuildingOperationMeta = {
  activityTitle: string
  activityDetail: string
  linkedExercise: string
  idleMessage: string
}

export const BUILDING_OPERATIONS: Record<WorldBuildingKey, BuildingOperationMeta> = {
  plaza: {
    activityTitle: '모임 · 워밍업',
    activityDetail: '회원들이 모여 운동을 시작하는 공간입니다',
    linkedExercise: 'PT · 그룹수업',
    idleMessage: '운동을 하면 광장이 활기차게 됩니다',
  },
  track: {
    activityTitle: '러닝 · 걸음',
    activityDetail: '걸음 인증 기록이 트랙에 쌓입니다',
    linkedExercise: '걸음 인증',
    idleMessage: '오늘 걸음을 인증하면 트랙이 돌아갑니다',
  },
  gym: {
    activityTitle: 'PT · 그룹수업',
    activityDetail: '수업과 PT가 진행되는 핵심 시설입니다',
    linkedExercise: 'PT · 그룹수업',
    idleMessage: '수업을 완료하면 체육관이 운영됩니다',
  },
  recovery: {
    activityTitle: '휴식 · 회복',
    activityDetail: '연속 출석과 휴식이 쌓이는 공간입니다',
    linkedExercise: '연속 출석',
    idleMessage: '꾸준히 운동하면 회복센터가 열립니다',
  },
  nutrition: {
    activityTitle: '일지 · 영양',
    activityDetail: '운동일지와 체성분 기록이 모입니다',
    linkedExercise: '운동일지 · 체성분',
    idleMessage: '일지를 작성하면 영양센터가 활성화됩니다',
  },
  hall: {
    activityTitle: '업적 · 기념',
    activityDetail: '운동 성과와 업적이 전시됩니다',
    linkedExercise: '업적 달성',
    idleMessage: '운동 업적이 쌓이면 전당이 빛납니다',
  },
}

export function productionRateForLevel(
  baseRate: number,
  level: number,
): number {
  if (level <= 0) return 0
  return Math.max(1, Math.round(baseRate * level))
}

export function operatingProgress(isActive: boolean, level: number): number {
  if (!isActive) return level > 0 ? 35 : 0
  return Math.min(95, 55 + level * 12)
}
