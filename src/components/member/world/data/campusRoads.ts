import { PLAZA_HUB, TREE_WORLD, WORLD_BUILDINGS } from './worldLayout'

function organicMidpoint(
  from: [number, number],
  to: [number, number],
  bend: number,
): [number, number] {
  const mx = (from[0] + to[0]) / 2
  const my = (from[1] + to[1]) / 2
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy) || 1
  return [
    Math.round(mx + (-dy / len) * bend),
    Math.round(my + (dx / len) * bend),
  ]
}

/** 타운스퀘어 → 각 시설 흙길 + 광장 내부 순환로 */
export function buildCampusRoadNetwork(): [number, number][][] {
  const hub: [number, number] = [PLAZA_HUB.cx, PLAZA_HUB.cy]

  const spokes: [number, number][][] = WORLD_BUILDINGS.filter(
    (b) => b.key !== 'plaza',
  ).map((b, i) => {
    const target: [number, number] = [b.cx, b.cy + 16]
    const bend = (i % 2 === 0 ? 1 : -1) * (24 + (i % 4) * 14)
    const mid = organicMidpoint(hub, target, bend)
    const near: [number, number] = [
      Math.round(hub[0] + (target[0] - hub[0]) * 0.68),
      Math.round(hub[1] + (target[1] - hub[1]) * 0.68),
    ]
    return [hub, mid, near, target]
  })

  const ring: [number, number][] = []
  const ringRx = PLAZA_HUB.rx * 0.7
  const ringRy = PLAZA_HUB.ry * 0.58
  for (let i = 0; i <= 9; i += 1) {
    const angle = ((-100 + i * 40) * Math.PI) / 180
    ring.push([
      Math.round(PLAZA_HUB.cx + ringRx * Math.cos(angle)),
      Math.round(PLAZA_HUB.cy + ringRy * Math.sin(angle)),
    ])
  }

  const treeToPlaza: [number, number][] = [
    [TREE_WORLD.cx, TREE_WORLD.cy + 48],
    [PLAZA_HUB.cx - 8, PLAZA_HUB.cy - 28],
    [PLAZA_HUB.cx, PLAZA_HUB.cy - 8],
  ]

  return [treeToPlaza, ...spokes, ring]
}

export const VILLAGE_ROAD_NETWORK = buildCampusRoadNetwork()

export function getTrackGymWalkPath(): [number, number][] {
  const track = WORLD_BUILDINGS.find((b) => b.key === 'track')!
  const gym = WORLD_BUILDINGS.find((b) => b.key === 'gym')!
  const hub: [number, number] = [PLAZA_HUB.cx, PLAZA_HUB.cy]
  return [
    [track.cx, track.cy + 12],
    organicMidpoint([track.cx, track.cy], hub, -32),
    hub,
    organicMidpoint(hub, [gym.cx, gym.cy], 28),
    [gym.cx, gym.cy + 12],
  ]
}
