/** 1024×1024 운동 왕국 캠퍼스 레이아웃 — 나무 중심 원형 배치 */

export const WORLD_SIZE = 1024

export const CAMPUS_RADIUS = 265

export const TREE_WORLD = {
  cx: 512,
  cy: 500,
  drawSize: 216,
  hitRadius: 60,
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
  plotRx: number
  plotRy: number
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

/** 북(-90°)부터 시계방향 6시설 원형 배치 */
const CAMPUS_ANGLES: Record<WorldBuildingKey, number> = {
  hall: -90,
  track: -30,
  gym: 30,
  plaza: 90,
  nutrition: 150,
  recovery: -150,
}

const UNIFIED_DRAW = 180
const UNIFIED_HIT = 78
const UNIFIED_PLOT_RX = 108
const UNIFIED_PLOT_RY = 78

function campusPosition(angleDeg: number): { cx: number; cy: number } {
  const rad = (angleDeg * Math.PI) / 180
  return {
    cx: Math.round(TREE_WORLD.cx + CAMPUS_RADIUS * Math.cos(rad)),
    cy: Math.round(TREE_WORLD.cy + CAMPUS_RADIUS * Math.sin(rad)),
  }
}

function def(
  key: WorldBuildingKey,
  title: string,
  shortLabel: string,
  description: string,
  spriteKey: string,
  unlockStageKey: string,
  legacyDbSlotKey?: string,
  plotRx = UNIFIED_PLOT_RX,
  plotRy = UNIFIED_PLOT_RY,
): WorldBuildingDef {
  const pos = campusPosition(CAMPUS_ANGLES[key])
  return {
    key,
    title,
    shortLabel,
    description,
    spriteKey,
    unlockStageKey,
    ...pos,
    drawSize: UNIFIED_DRAW,
    hitRadius: UNIFIED_HIT,
    plotRx,
    plotRy,
    legacyDbSlotKey,
  }
}

export const WORLD_BUILDINGS: WorldBuildingDef[] = [
  def(
    'hall',
    '명예의 전당',
    '전당',
    '운동 업적을 기념하는 북쪽 랜드마크입니다.',
    'slg_hall_of_fame',
    'sakura',
    'south',
    115,
    82,
  ),
  def(
    'track',
    '러닝트랙',
    '트랙',
    '걸음과 러닝이 쌓이는 동북 시설입니다.',
    'slg_running_track',
    'small',
    'west',
    112,
    80,
  ),
  def(
    'gym',
    '체육관',
    '체육관',
    'PT와 수업이 이루어지는 동남 핵심 시설입니다.',
    'slg_gym',
    'large',
    'east',
    118,
    85,
  ),
  def(
    'plaza',
    '운동광장',
    '광장',
    '모임과 워밍업이 이루어지는 남쪽 광장입니다.',
    'slg_exercise_plaza',
    'sprout',
    'north',
    120,
    88,
  ),
  def(
    'nutrition',
    '영양센터',
    '영양',
    '일지와 체성분을 돕는 남서 시설입니다.',
    'slg_nutrition_center',
    'large',
    undefined,
    108,
    78,
  ),
  def(
    'recovery',
    '회복센터',
    '회복',
    '휴식과 회복의 서북 시설입니다.',
    'slg_recovery_center',
    'small',
    undefined,
    108,
    78,
  ),
]

export const WORLD_PATHS: { key: WorldBuildingKey; points: [number, number][] }[] =
  []

export function stageRank(stageKey: string): number {
  return STAGE_RANK[stageKey] ?? 0
}

export function isStageUnlocked(
  currentStageKey: string,
  unlockStageKey: string,
): boolean {
  return stageRank(currentStageKey) >= stageRank(unlockStageKey)
}

export function getBuildingByKey(key: WorldBuildingKey): WorldBuildingDef {
  const b = WORLD_BUILDINGS.find((x) => x.key === key)
  if (!b) throw new Error(`Unknown building: ${key}`)
  return b
}
