/** 1024×1024 — 운동나무 중심 · 내 운동 세계 v2 */

export const WORLD_SIZE = 1024

/** 운동나무 = 절대 주인공 (화면 비중 60%) */
export const TREE_WORLD = {
  cx: 512,
  cy: 512,
  drawSize: 584,
  hitRadius: 118,
} as const

/** 중앙 운동광장(타운스퀘어) — 시설 에셋이 아닌 지형 허브 */
export const PLAZA_HUB = {
  cx: 512,
  cy: 512,
  rx: 172,
  ry: 142,
} as const

export const FACILITY_ORBIT = 248

export const CAMPUS_RADIUS = FACILITY_ORBIT + 80

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
  /** true면 PNG 건물 대신 광장 지형만 사용 */
  terrainOnly?: boolean
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

const UNIFIED_DRAW = 84
const UNIFIED_HIT = 52
const UNIFIED_PLOT_RX = 68
const UNIFIED_PLOT_RY = 50

/** 북 트랙 · 동 체육관 · 서 회복 · 남 영양 · 광장=지형 */
const LAYOUT: Record<
  WorldBuildingKey,
  { cx: number; cy: number; plotRx?: number; plotRy?: number; drawSize?: number }
> = {
  plaza: { cx: 512, cy: 512, plotRx: 0, plotRy: 0 },
  track: { cx: 512, cy: 264 },
  gym: { cx: 760, cy: 512 },
  recovery: { cx: 264, cy: 512 },
  nutrition: { cx: 512, cy: 760 },
  hall: { cx: 688, cy: 648, plotRx: 58, plotRy: 42, drawSize: 72 },
}

function def(
  key: WorldBuildingKey,
  title: string,
  shortLabel: string,
  description: string,
  spriteKey: string,
  unlockStageKey: string,
  legacyDbSlotKey?: string,
  terrainOnly = false,
): WorldBuildingDef {
  const pos = LAYOUT[key]
  return {
    key,
    title,
    shortLabel,
    description,
    spriteKey,
    unlockStageKey,
    cx: pos.cx,
    cy: pos.cy,
    drawSize: pos.drawSize ?? UNIFIED_DRAW,
    hitRadius: UNIFIED_HIT,
    plotRx: pos.plotRx ?? UNIFIED_PLOT_RX,
    plotRy: pos.plotRy ?? UNIFIED_PLOT_RY,
    legacyDbSlotKey,
    terrainOnly,
  }
}

export const WORLD_BUILDINGS: WorldBuildingDef[] = [
  def(
    'plaza',
    '운동광장',
    '광장',
    '운동나무 아래 중심 광장입니다.',
    'slg_exercise_plaza',
    'sprout',
    'north',
    true,
  ),
  def(
    'track',
    '러닝트랙',
    '트랙',
    '운동나무 성장의 결과로 열린 북쪽 시설입니다.',
    'slg_running_track',
    'small',
    'west',
  ),
  def(
    'gym',
    '체육관',
    '체육관',
    '운동나무 성장의 결과로 열린 동쪽 시설입니다.',
    'slg_gym',
    'large',
    'east',
  ),
  def(
    'recovery',
    '회복센터',
    '회복',
    '운동나무 성장의 결과로 열린 서쪽 시설입니다.',
    'slg_recovery_center',
    'small',
  ),
  def(
    'nutrition',
    '영양센터',
    '영양',
    '운동나무 성장의 결과로 열린 남쪽 시설입니다.',
    'slg_nutrition_center',
    'large',
  ),
  def(
    'hall',
    '명예의 전당',
    '전당',
    '운동 업적을 기념하는 작은 랜드마크입니다.',
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
