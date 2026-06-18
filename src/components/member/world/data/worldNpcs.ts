import { VILLAGE_ROAD_NETWORK } from './worldMapGenerator'
import { TRACK_GYM_WALK_PATH } from './worldEnvironment'

export type VillageNpcDef = {
  id: string
  path: [number, number][]
  dur: number
  delay: number
  skin: string
  shirt: string
  pants: string
  scale: number
}

const NPC_COLORS = [
  { skin: '#ffcc80', shirt: '#ef5350', pants: '#1565c0' },
  { skin: '#ffab91', shirt: '#66bb6a', pants: '#37474f' },
  { skin: '#ffe0b2', shirt: '#42a5f5', pants: '#5d4037' },
  { skin: '#ffcc80', shirt: '#ffa726', pants: '#283593' },
  { skin: '#f8bbd0', shirt: '#ab47bc', pants: '#455a64' },
  { skin: '#ffcc80', shirt: '#26c6da', pants: '#4e342e' },
  { skin: '#d7ccc8', shirt: '#ec407a', pants: '#1b5e20' },
  { skin: '#ffcc80', shirt: '#ff7043', pants: '#0d47a1' },
]

/** 트랙↔체육관 왕복 경로 */
function trackGymLoop(): [number, number][] {
  return [...TRACK_GYM_WALK_PATH, ...[...TRACK_GYM_WALK_PATH].reverse().slice(1)]
}

function roadSegment(startIdx: number, endIdx: number, roadIdx: number): [number, number][] {
  const road = VILLAGE_ROAD_NETWORK[roadIdx] ?? VILLAGE_ROAD_NETWORK[0]
  return road.slice(startIdx, endIdx + 1) as [number, number][]
}

let cachedNpcs: VillageNpcDef[] | null = null

export function generateVillageNpcs(): VillageNpcDef[] {
  if (cachedNpcs) return cachedNpcs

  cachedNpcs = [
    {
      id: 'npc-track-gym-1',
      path: trackGymLoop(),
      dur: 14,
      delay: 0,
      ...NPC_COLORS[0],
      scale: 1.35,
    },
    {
      id: 'npc-track-gym-2',
      path: [...trackGymLoop()].reverse(),
      dur: 16,
      delay: 4,
      ...NPC_COLORS[1],
      scale: 1.3,
    },
    {
      id: 'npc-east-road',
      path: roadSegment(0, 4, 1),
      dur: 12,
      delay: 1,
      ...NPC_COLORS[2],
      scale: 1.2,
    },
    {
      id: 'npc-west-road',
      path: roadSegment(0, 4, 2),
      dur: 13,
      delay: 2.5,
      ...NPC_COLORS[3],
      scale: 1.2,
    },
    {
      id: 'npc-south-east',
      path: roadSegment(0, 4, 3),
      dur: 11,
      delay: 0.5,
      ...NPC_COLORS[4],
      scale: 1.15,
    },
    {
      id: 'npc-south-west',
      path: roadSegment(0, 4, 4),
      dur: 12,
      delay: 3,
      ...NPC_COLORS[5],
      scale: 1.15,
    },
    {
      id: 'npc-cross',
      path: roadSegment(2, 6, 5),
      dur: 10,
      delay: 1.5,
      ...NPC_COLORS[6],
      scale: 1.25,
    },
    {
      id: 'npc-north',
      path: roadSegment(0, 4, 0),
      dur: 11,
      delay: 2,
      ...NPC_COLORS[7],
      scale: 1.2,
    },
  ]

  return cachedNpcs
}

export function pathToSvgD(points: [number, number][]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')}`
}
