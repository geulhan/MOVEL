/** 1024×1024 운동 마을 월드 레이아웃 */

export const WORLD_SIZE = 1024

export const TREE_WORLD = {
  cx: 512,
  cy: 500,
  drawSize: 360,
  hitRadius: 100,
} as const

export type WorldBuildingKey =
  | 'plaza'
  | 'track'
  | 'gym'
  | 'recovery'
  | 'nutrition'
  | 'hall'

export type WorldBuildingDef = {
  key: WorldBuildingKey
  title: string
  shortLabel: string
  description: string
  spriteKey: string
  unlockStageKey: string
  cx: number
  cy: number
  drawSize: number
  hitRadius: number
  legacyDbSlotKey?: string
}

export const STAGE_RANK: Record<string, number> = {
  none: 0,
  seed: 1,
  sprout: 2,
  small: 3,
  large: 4,
  sakura: 5,
}

export const UNLOCK_STAGE_LABEL: Record<string, string> = {
  sprout: '새싹',
  small: '어린 나무',
  large: '큰 나무',
  sakura: '벚꽃나무',
}

/** 건물은 길 끝·길변에 배치 — 원형 배치 아님 */
export const WORLD_BUILDINGS: WorldBuildingDef[] = [
  {
    key: 'plaza',
    title: '운동광장',
    shortLabel: '광장',
    description: '마을 중심 광장 가장자리의 모임 공간입니다.',
    spriteKey: 'slg_exercise_plaza',
    unlockStageKey: 'sprout',
    cx: 598,
    cy: 498,
    drawSize: 155,
    hitRadius: 58,
    legacyDbSlotKey: 'north',
  },
  {
    key: 'hall',
    title: '명예의 전당',
    shortLabel: '전당',
    description: '북쪽 숲길 끝, 운동 업적을 기념하는 랜드마크입니다.',
    spriteKey: 'slg_hall_of_fame',
    unlockStageKey: 'sakura',
    cx: 478,
    cy: 148,
    drawSize: 165,
    hitRadius: 62,
    legacyDbSlotKey: 'south',
  },
  {
    key: 'track',
    title: '러닝트랙',
    shortLabel: '트랙',
    description: '동쪽 언덕길 끝, 걸음과 러닝이 쌓이는 트랙입니다.',
    spriteKey: 'slg_running_track',
    unlockStageKey: 'small',
    cx: 848,
    cy: 408,
    drawSize: 160,
    hitRadius: 60,
    legacyDbSlotKey: 'west',
  },
  {
    key: 'recovery',
    title: '회복센터',
    shortLabel: '회복',
    description: '서쪽 계곡길 옆, 휴식과 회복의 시설입니다.',
    spriteKey: 'slg_recovery_center',
    unlockStageKey: 'small',
    cx: 168,
    cy: 455,
    drawSize: 150,
    hitRadius: 56,
  },
  {
    key: 'gym',
    title: '체육관',
    shortLabel: '체육관',
    description: '남동 내리막 끝, PT와 수업이 이루어집니다.',
    spriteKey: 'slg_gym',
    unlockStageKey: 'large',
    cx: 808,
    cy: 698,
    drawSize: 170,
    hitRadius: 64,
    legacyDbSlotKey: 'east',
  },
  {
    key: 'nutrition',
    title: '영양센터',
    shortLabel: '영양',
    description: '남서 늪길 끝, 일지와 체성분을 돕습니다.',
    spriteKey: 'slg_nutrition_center',
    unlockStageKey: 'large',
    cx: 228,
    cy: 718,
    drawSize: 152,
    hitRadius: 56,
  },
]

export const WORLD_PATHS: { key: WorldBuildingKey; points: [number, number][] }[] = []

export function stageRank(stageKey: string): number {
  return STAGE_RANK[stageKey] ?? 0
}

export function isStageUnlocked(
  currentStageKey: string,
  unlockStageKey: string,
): boolean {
  return stageRank(currentStageKey) >= stageRank(unlockStageKey)
}
