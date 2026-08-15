import {
  getFacilityPath,
  getPlazaRingPath,
  VILLAGE_ROAD_NETWORK,
} from './campusRoads'
import { PLAZA_HUB } from './worldLayout'

export type VillageNpcDef = {
  id: string
  path: [number, number][]
  dur: number
  delay: number
  skin: string
  shirt: string
  pants: string
  scale: number
  /** 고정 위치 NPC (광장 말풍선용) */
  static?: boolean
  bubble?: string
}

const NPC_COLORS = [
  { skin: '#ffcc80', shirt: '#ef5350', pants: '#1565c0' },
  { skin: '#ffab91', shirt: '#66bb6a', pants: '#37474f' },
  { skin: '#ffe0b2', shirt: '#42a5f5', pants: '#5d4037' },
  { skin: '#f8bbd0', shirt: '#ab47bc', pants: '#455a64' },
  { skin: '#ffcc80', shirt: '#ffa726', pants: '#283593' },
]

let cachedNpcs: VillageNpcDef[] | null = null

export function resetVillageNpcCache() {
  cachedNpcs = null
}

/** 광장·시설 길 위를 걷는 캐릭터 + 광장 말풍선 NPC */
export function generateVillageNpcs(): VillageNpcDef[] {
  if (cachedNpcs) return cachedNpcs

  const plazaLoop = getPlazaRingPath()
  const trackLoop = getFacilityPath('track')
  const gymLoop = getFacilityPath('gym')
  const recoveryLoop = getFacilityPath('recovery')
  const nutritionLoop = getFacilityPath('nutrition')

  const { cx, cy } = PLAZA_HUB

  cachedNpcs = [
    {
      id: 'npc-plaza-walk',
      path: plazaLoop,
      dur: 18,
      delay: 0,
      ...NPC_COLORS[0],
      scale: 1.2,
    },
    {
      id: 'npc-track-run',
      path: trackLoop,
      dur: 14,
      delay: 2,
      ...NPC_COLORS[1],
      scale: 1.15,
    },
    {
      id: 'npc-gym',
      path: gymLoop,
      dur: 13,
      delay: 1,
      ...NPC_COLORS[2],
      scale: 1.15,
    },
    {
      id: 'npc-recovery',
      path: recoveryLoop,
      dur: 15,
      delay: 3,
      ...NPC_COLORS[3],
      scale: 1.1,
    },
    {
      id: 'npc-nutrition',
      path: nutritionLoop,
      dur: 14,
      delay: 0.5,
      ...NPC_COLORS[4],
      scale: 1.1,
    },
    {
      id: 'npc-plaza-bench-1',
      path: [[cx - 72, cy + 38] as [number, number]],
      dur: 0,
      delay: 0,
      ...NPC_COLORS[2],
      scale: 1.25,
      static: true,
      bubble: '오늘도 출석했어요!',
    },
    {
      id: 'npc-plaza-bench-2',
      path: [[cx + 78, cy + 28] as [number, number]],
      dur: 0,
      delay: 0,
      ...NPC_COLORS[4],
      scale: 1.2,
      static: true,
      bubble: '운동일지 쓰면 나무가 자라요',
    },
    {
      id: 'npc-plaza-tree',
      path: [[cx - 28, cy - 52] as [number, number]],
      dur: 0,
      delay: 0,
      ...NPC_COLORS[0],
      scale: 1.15,
      static: true,
      bubble: '꾸준히 하면 돼요',
    },
  ].filter((n) => n.path.length >= 1) as VillageNpcDef[]

  return cachedNpcs
}

export function pathToSvgD(points: [number, number][]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')}`
}

export { VILLAGE_ROAD_NETWORK }
