/**
 * 운동 마을 환경 장식 — 건물보다 낮은 시각 우선순위
 * 결정적 랜덤 배치 (시드 고정)
 */

import { TREE_WORLD, WORLD_BUILDINGS, WORLD_SIZE } from './worldLayout'
import { VILLAGE_ROAD_NETWORK } from './worldMapGenerator'

export type EnvPropType =
  | 'small_tree'
  | 'flower_bed'
  | 'dumbbell_rack'
  | 'bench'
  | 'street_lamp'
  | 'exercise_sign'
  | 'rock'
  | 'fence'
  | 'dirt_path'
  | 'grass_patch'

export type EnvProp = {
  id: string
  type: EnvPropType
  x: number
  y: number
  rot: number
  scale: number
}

function hash(n: number): number {
  let x = n | 0
  x = ((x >> 16) ^ x) * 0x45d9f3b
  x = ((x >> 16) ^ x) * 0x45d9f3b
  x = (x >> 16) ^ x
  return Math.abs(x)
}

function distToSegment(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const dx = x1 - x0
  const dy = y1 - y0
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - x0, py - y0)
  let t = ((px - x0) * dx + (py - y0) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))
}

function nearRoad(x: number, y: number, width = 42): boolean {
  for (const poly of VILLAGE_ROAD_NETWORK) {
    if (minDistPoly(x, y, poly) <= width) return true
  }
  return false
}

function minDistPoly(px: number, py: number, points: [number, number][]): number {
  let min = Infinity
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    min = Math.min(min, distToSegment(px, py, x0, y0, x1, y1))
  }
  return min
}

function inExclusionZone(x: number, y: number): boolean {
  if (Math.hypot(x - TREE_WORLD.cx, y - TREE_WORLD.cy) < TREE_WORLD.hitRadius + 36) {
    return true
  }
  for (const b of WORLD_BUILDINGS) {
    if (Math.hypot(x - b.cx, y - b.cy) < b.hitRadius + 48) return true
  }
  const dx = (x - TREE_WORLD.cx) / 130
  const dy = (y - (TREE_WORLD.cy + 10)) / 105
  if (dx * dx + dy * dy < 0.55) return true
  return false
}

const PROP_TYPES: EnvPropType[] = [
  'small_tree',
  'small_tree',
  'flower_bed',
  'flower_bed',
  'grass_patch',
  'grass_patch',
  'grass_patch',
  'rock',
  'rock',
  'bench',
  'bench',
  'street_lamp',
  'street_lamp',
  'dumbbell_rack',
  'exercise_sign',
  'fence',
  'dirt_path',
]

let cachedProps: EnvProp[] | null = null

export function generateWorldEnvironment(): EnvProp[] {
  if (cachedProps) return cachedProps

  const props: EnvProp[] = []
  const step = 44
  let idx = 0

  for (let y = 72; y < WORLD_SIZE - 48; y += step) {
    for (let x = 48; x < WORLD_SIZE - 48; x += step) {
      const jitterX = (hash(idx * 17 + 3) % 20) - 10
      const jitterY = (hash(idx * 31 + 7) % 20) - 10
      const px = x + jitterX
      const py = y + jitterY
      idx += 1

      if (inExclusionZone(px, py)) continue

      const roll = hash(idx * 97) % 100
      if (roll > 46) continue

      let typeIdx = hash(idx * 53) % PROP_TYPES.length
      let type = PROP_TYPES[typeIdx]

      if (type === 'bench' || type === 'street_lamp' || type === 'exercise_sign') {
        if (!nearRoad(px, py, 50)) {
          type = PROP_TYPES[(typeIdx + 3) % PROP_TYPES.length]
        }
      }
      if (type === 'dirt_path' && nearRoad(px, py, 30)) continue
      if (type === 'fence' && py > 120 && py < WORLD_SIZE - 120) continue

      props.push({
        id: `env-${idx}`,
        type,
        x: px,
        y: py,
        rot: (hash(idx * 11) % 24) - 12,
        scale: 0.85 + (hash(idx * 19) % 30) / 100,
      })
    }
  }

  cachedProps = props
  return props
}

/** 러닝트랙 ↔ 체육관 연결 산책로 */
export const TRACK_GYM_WALK_PATH: [number, number][] = [
  [848, 408],
  [820, 460],
  [790, 520],
  [770, 580],
  [785, 640],
  [808, 698],
]

export function getVillageBounds() {
  const xs = WORLD_BUILDINGS.map((b) => b.cx)
  const ys = WORLD_BUILDINGS.map((b) => b.cy)
  xs.push(TREE_WORLD.cx)
  ys.push(TREE_WORLD.cy)
  const minX = Math.min(...xs) - 120
  const maxX = Math.max(...xs) + 120
  const minY = Math.min(...ys) - 100
  const maxY = Math.max(...ys) + 100
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  }
}
