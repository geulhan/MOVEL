import { PLAZA_HUB, TREE_WORLD, WORLD_BUILDINGS } from './worldLayout'

function pathToFacility(buildingKey: string): [number, number][] {
  const b = WORLD_BUILDINGS.find((x) => x.key === buildingKey)
  if (!b || b.terrainOnly) return []

  const center: [number, number] = [PLAZA_HUB.cx, PLAZA_HUB.cy]
  const treeBase: [number, number] = [TREE_WORLD.cx, TREE_WORLD.cy + 58]
  const target: [number, number] = [b.cx, b.cy + 14]

  const dx = target[0] - center[0]
  const dy = target[1] - center[1]
  const len = Math.hypot(dx, dy) || 1
  const edge: [number, number] = [
    Math.round(center[0] + (dx / len) * (PLAZA_HUB.rx * 0.52)),
    Math.round(center[1] + (dy / len) * (PLAZA_HUB.ry * 0.52)),
  ]
  const mid: [number, number] = [
    Math.round((edge[0] + target[0]) / 2),
    Math.round((edge[1] + target[1]) / 2),
  ]

  return [target, mid, edge, treeBase]
}

/** 시설 → 광장 → 운동나무 직결 흙길 */
export function buildCampusRoadNetwork(): [number, number][][] {
  const spokes = ['track', 'gym', 'recovery', 'nutrition', 'hall']
    .map((key) => pathToFacility(key))
    .filter((p) => p.length > 0)

  const ring: [number, number][] = []
  for (let i = 0; i <= 16; i += 1) {
    const angle = ((i / 16) * Math.PI * 2) - Math.PI / 2
    ring.push([
      Math.round(PLAZA_HUB.cx + PLAZA_HUB.rx * 0.62 * Math.cos(angle)),
      Math.round(PLAZA_HUB.cy + PLAZA_HUB.ry * 0.52 * Math.sin(angle)),
    ])
  }

  return [...spokes, ring]
}

export const VILLAGE_ROAD_NETWORK = buildCampusRoadNetwork()

export function getPlazaRingPath(): [number, number][] {
  const ring = VILLAGE_ROAD_NETWORK[VILLAGE_ROAD_NETWORK.length - 1]
  return [...ring, ring[0]]
}

export function getFacilityPath(key: string): [number, number][] {
  const path = pathToFacility(key)
  return path.length > 0 ? [...path, ...[...path].reverse().slice(1)] : []
}

export function getTrackGymWalkPath(): [number, number][] {
  return getFacilityPath('track')
}
