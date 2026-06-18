import { TREE_WORLD, WORLD_BUILDINGS } from './worldLayout'

/** 운동나무 허브 → 각 시설 허브 스포크 + 내부 순환로 */
export function buildCampusRoadNetwork(): [number, number][][] {
  const hub: [number, number] = [TREE_WORLD.cx, TREE_WORLD.cy]
  const spokes: [number, number][][] = WORLD_BUILDINGS.map((b) => {
    const midX = Math.round(hub[0] + (b.cx - hub[0]) * 0.42)
    const midY = Math.round(hub[1] + (b.cy - hub[1]) * 0.42)
    const nearX = Math.round(hub[0] + (b.cx - hub[0]) * 0.78)
    const nearY = Math.round(hub[1] + (b.cy - hub[1]) * 0.78)
    return [
      hub,
      [midX, midY],
      [nearX, nearY],
      [b.cx, b.cy + 18],
    ]
  })

  const ringR = 128
  const ring: [number, number][] = []
  for (let i = 0; i <= 6; i += 1) {
    const angle = ((-90 + i * 60) * Math.PI) / 180
    ring.push([
      Math.round(hub[0] + ringR * Math.cos(angle)),
      Math.round(hub[1] + ringR * Math.sin(angle)),
    ])
  }

  return [...spokes, ring]
}

export const VILLAGE_ROAD_NETWORK = buildCampusRoadNetwork()

export function getTrackGymWalkPath(): [number, number][] {
  const track = WORLD_BUILDINGS.find((b) => b.key === 'track')!
  const gym = WORLD_BUILDINGS.find((b) => b.key === 'gym')!
  const hub: [number, number] = [TREE_WORLD.cx, TREE_WORLD.cy]
  return [
    [track.cx, track.cy + 12],
    [
      Math.round((track.cx + gym.cx) / 2 + 20),
      Math.round((track.cy + gym.cy) / 2 - 15),
    ],
    [hub[0] + 95, hub[1] + 55],
    [
      Math.round((track.cx + gym.cx) / 2 - 20),
      Math.round((track.cy + gym.cy) / 2 + 15),
    ],
    [gym.cx, gym.cy + 12],
  ]
}
