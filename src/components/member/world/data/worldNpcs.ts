import {
  getFacilityPath,
  getPlazaRingPath,
  VILLAGE_ROAD_NETWORK,
} from './campusRoads'

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
  { skin: '#f8bbd0', shirt: '#ab47bc', pants: '#455a64' },
  { skin: '#ffcc80', shirt: '#ffa726', pants: '#283593' },
]

let cachedNpcs: VillageNpcDef[] | null = null

export function resetVillageNpcCache() {
  cachedNpcs = null
}

/** 광장·시설 길 위를 걷는 캐릭터 (나무 매달림 연출 없음) */
export function generateVillageNpcs(): VillageNpcDef[] {
  if (cachedNpcs) return cachedNpcs

  const plazaLoop = getPlazaRingPath()
  const trackLoop = getFacilityPath('track')
  const gymLoop = getFacilityPath('gym')
  const recoveryLoop = getFacilityPath('recovery')
  const nutritionLoop = getFacilityPath('nutrition')

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
  ].filter((n) => n.path.length >= 2)

  return cachedNpcs
}

export function pathToSvgD(points: [number, number][]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')}`
}

export { VILLAGE_ROAD_NETWORK }
