/**
 * 운동 왕국 캠퍼스 장식 — 최소 배치 (부지·건물 우선)
 */

import { CAMPUS_RADIUS, TREE_WORLD, WORLD_BUILDINGS, WORLD_SIZE } from './worldLayout'
import { VILLAGE_ROAD_NETWORK } from './campusRoads'
import { getTrackGymWalkPath } from './campusRoads'

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

function minDistPoly(px: number, py: number, points: [number, number][]): number {
  let min = Infinity
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    min = Math.min(min, distToSegment(px, py, x0, y0, x1, y1))
  }
  return min
}

function nearRoad(x: number, y: number, width = 42): boolean {
  for (const poly of VILLAGE_ROAD_NETWORK) {
    if (minDistPoly(x, y, poly) <= width) return true
  }
  return false
}

function inExclusionZone(x: number, y: number): boolean {
  if (Math.hypot(x - TREE_WORLD.cx, y - TREE_WORLD.cy) < CAMPUS_RADIUS - 40) {
    return true
  }
  for (const b of WORLD_BUILDINGS) {
    const dx = (x - b.cx) / (b.plotRx + 20)
    const dy = (y - (b.cy + 14)) / (b.plotRy + 16)
    if (dx * dx + dy * dy <= 1.2) return true
  }
  return false
}

const PROP_TYPES: EnvPropType[] = [
  'bench',
  'street_lamp',
  'fence',
  'grass_patch',
]

let cachedProps: EnvProp[] | null = null

export function generateWorldEnvironment(): EnvProp[] {
  if (cachedProps) return cachedProps

  const props: EnvProp[] = []
  const step = 72
  let idx = 0

  for (let y = 80; y < WORLD_SIZE - 56; y += step) {
    for (let x = 56; x < WORLD_SIZE - 56; x += step) {
      const jitterX = (hash(idx * 17 + 3) % 16) - 8
      const jitterY = (hash(idx * 31 + 7) % 16) - 8
      const px = x + jitterX
      const py = y + jitterY
      idx += 1

      if (inExclusionZone(px, py)) continue
      if (Math.hypot(px - TREE_WORLD.cx, py - TREE_WORLD.cy) < 420) continue

      const roll = hash(idx * 97) % 100
      if (roll > 14) continue

      let type = PROP_TYPES[hash(idx * 53) % PROP_TYPES.length]
      if ((type === 'bench' || type === 'street_lamp') && !nearRoad(px, py, 48)) {
        type = 'grass_patch'
      }

      props.push({
        id: `env-${idx}`,
        type,
        x: px,
        y: py,
        rot: (hash(idx * 11) % 16) - 8,
        scale: 0.9 + (hash(idx * 19) % 15) / 100,
      })
    }
  }

  cachedProps = props
  return props
}

export const TRACK_GYM_WALK_PATH = getTrackGymWalkPath()

export function getVillageBounds() {
  const span = CAMPUS_RADIUS + 200
  return {
    cx: TREE_WORLD.cx,
    cy: TREE_WORLD.cy,
    width: span * 2.1,
    height: span * 2.1,
  }
}
