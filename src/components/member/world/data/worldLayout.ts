/** 1024×1024 운동 왕국 — 운동나무 중심, 타운스퀘어 허브 */

export const WORLD_SIZE = 1024

export const TREE_WORLD = {
  cx: 512,
  cy: 512,
  drawSize: 389,
  hitRadius: 108,
} as const

/** 중앙 운동광장(타운스퀘어) — 흙길 허브 */
export const PLAZA_HUB = {
  cx: 512,
  cy: 558,
  rx: 152,
  ry: 120,
} as const

export const CAMPUS_RADIUS = 295

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

const UNIFIED_DRAW = 135
const UNIFIED_HIT = 62
const UNIFIED_PLOT_RX = 88
const UNIFIED_PLOT_RY = 64

/** 비대칭·유기적 배치 — 게임 마을 느낌 */
const ORGANIC_LAYOUT: Record<
  WorldBuildingKey,
  { cx: number; cy: number; plotRx?: number; plotRy?: number }
> = {
  plaza: { cx: 512, cy: 602, plotRx: 102, plotRy: 74 },
  gym: { cx: 678, cy: 438, plotRx: 90, plotRy: 64 },
  track: { cx: 362, cy: 388, plotRx: 88, plotRy: 62 },
  recovery: { cx: 318, cy: 542, plotRx: 86, plotRy: 60 },
  nutrition: { cx: 448, cy: 718, plotRx: 88, plotRy: 62 },
  hall: { cx: 738, cy: 578, plotRx: 92, plotRy: 66 },
}

function def(
  key: WorldBuildingKey,
  title: string,
  shortLabel: string,
  description: string,
  spriteKey: string,
  unlockStageKey: string,
  legacyDbSlotKey?: string,
): WorldBuildingDef {
  const pos = ORGANIC_LAYOUT[key]
  return {
    key,
    title,
    shortLabel,
    description,
    spriteKey,
    unlockStageKey,
    cx: pos.cx,
    cy: pos.cy,
    drawSize: UNIFIED_DRAW,
    hitRadius: UNIFIED_HIT,
    plotRx: pos.plotRx ?? UNIFIED_PLOT_RX,
    plotRy: pos.plotRy ?? UNIFIED_PLOT_RY,
    legacyDbSlotKey,
  }
}

export const WORLD_BUILDINGS: WorldBuildingDef[] = [
  def(
    'plaza',
    '운동광장',
    '광장',
    '왕국 중심 광장에서 모임과 워밍업을 합니다.',
    'slg_exercise_plaza',
    'sprout',
    'north',
  ),
  def(
    'gym',
    '체육관',
    '체육관',
    'PT와 수업이 이루어지는 동쪽 핵심 시설입니다.',
    'slg_gym',
    'large',
    'east',
  ),
  def(
    'track',
    '러닝트랙',
    '트랙',
    '걸음과 러닝이 쌓이는 북서쪽 시설입니다.',
    'slg_running_track',
    'small',
    'west',
  ),
  def(
    'recovery',
    '회복센터',
    '회복',
    '휴식과 회복의 서쪽 시설입니다.',
    'slg_recovery_center',
    'small',
  ),
  def(
    'nutrition',
    '영양센터',
    '영양',
    '일지와 체성분을 돕는 남쪽 시설입니다.',
    'slg_nutrition_center',
    'large',
  ),
  def(
    'hall',
    '명예의 전당',
    '전당',
    '운동 업적을 기념하는 동남쪽 랜드마크입니다.',
    'slg_hall_of_fame',
    'sakura',
    'south',
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
