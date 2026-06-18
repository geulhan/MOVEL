/** 1024×1024 운동 마을 월드 레이아웃 */

export const WORLD_SIZE = 1024

export const TREE_WORLD = {
  cx: 512,
  cy: 500,
  drawSize: 360,
  hitRadius: 120,
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
  /** migration_091 DB slot_key (P0: 4개만 연결) */
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

/**
 * 운동나무 중심 방사형 — 십자 배치 아님
 * 길이 나무에서 각 시설로 뻗어나가는 구조
 */
export const WORLD_BUILDINGS: WorldBuildingDef[] = [
  {
    key: 'plaza',
    title: '운동광장',
    shortLabel: '광장',
    description: '마을의 중심. 모임과 워밍업이 이루어지는 공간입니다.',
    spriteKey: 'slg_exercise_plaza',
    unlockStageKey: 'sprout',
    cx: 512,
    cy: 280,
    drawSize: 200,
    hitRadius: 88,
    legacyDbSlotKey: 'north',
  },
  {
    key: 'hall',
    title: '명예의 전당',
    shortLabel: '전당',
    description: '운동 업적과 성장의 결실을 기념하는 랜드마크입니다.',
    spriteKey: 'slg_hall_of_fame',
    unlockStageKey: 'sakura',
    cx: 468,
    cy: 118,
    drawSize: 190,
    hitRadius: 82,
    legacyDbSlotKey: 'south',
  },
  {
    key: 'track',
    title: '러닝트랙',
    shortLabel: '트랙',
    description: '걸음과 러닝 기록이 쌓이는 트랙입니다.',
    spriteKey: 'slg_running_track',
    unlockStageKey: 'small',
    cx: 798,
    cy: 368,
    drawSize: 210,
    hitRadius: 95,
    legacyDbSlotKey: 'west',
  },
  {
    key: 'recovery',
    title: '회복센터',
    shortLabel: '회복',
    description: '연속 출석과 휴식으로 회복을 돕는 시설입니다.',
    spriteKey: 'slg_recovery_center',
    unlockStageKey: 'small',
    cx: 228,
    cy: 432,
    drawSize: 175,
    hitRadius: 78,
  },
  {
    key: 'gym',
    title: '체육관',
    shortLabel: '체육관',
    description: 'PT와 그룹 수업이 이루어지는 핵심 시설입니다.',
    spriteKey: 'slg_gym',
    unlockStageKey: 'large',
    cx: 748,
    cy: 612,
    drawSize: 220,
    hitRadius: 98,
    legacyDbSlotKey: 'east',
  },
  {
    key: 'nutrition',
    title: '영양센터',
    shortLabel: '영양',
    description: '운동일지와 체성분 기록을 돕는 시설입니다.',
    spriteKey: 'slg_nutrition_center',
    unlockStageKey: 'large',
    cx: 268,
    cy: 668,
    drawSize: 180,
    hitRadius: 80,
  },
]

/** 나무에서 시설로 이어지는 길 (월드 좌표) */
export const WORLD_PATHS: { key: WorldBuildingKey; points: [number, number][] }[] = [
  {
    key: 'plaza',
    points: [
      [512, 500],
      [512, 420],
      [512, 340],
    ],
  },
  {
    key: 'hall',
    points: [
      [512, 500],
      [490, 400],
      [478, 280],
      [468, 180],
    ],
  },
  {
    key: 'track',
    points: [
      [512, 500],
      [580, 460],
      [680, 410],
      [760, 380],
    ],
  },
  {
    key: 'recovery',
    points: [
      [512, 500],
      [440, 480],
      [340, 455],
      [260, 440],
    ],
  },
  {
    key: 'gym',
    points: [
      [512, 500],
      [560, 540],
      [640, 580],
      [720, 610],
    ],
  },
  {
    key: 'nutrition',
    points: [
      [512, 500],
      [460, 560],
      [360, 620],
      [290, 660],
    ],
  },
]

export function stageRank(stageKey: string): number {
  return STAGE_RANK[stageKey] ?? 0
}

export function isStageUnlocked(
  currentStageKey: string,
  unlockStageKey: string,
): boolean {
  return stageRank(currentStageKey) >= stageRank(unlockStageKey)
}
