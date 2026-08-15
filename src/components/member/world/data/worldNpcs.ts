import {
  getFacilityPath,
  getPlazaRingPath,
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
  hair: string
  scale: number
  static?: boolean
  bubble?: string
}

const NPCS = [
  { skin: '#ffcc80', shirt: '#ef5350', pants: '#1565c0', hair: '#4e342e' },
  { skin: '#ffab91', shirt: '#66bb6a', pants: '#37474f', hair: '#3e2723' },
  { skin: '#ffe0b2', shirt: '#42a5f5', pants: '#5d4037', hair: '#212121' },
] as const

let cachedNpcs: VillageNpcDef[] | null = null

export function resetVillageNpcCache() {
  cachedNpcs = null
}

export function generateVillageNpcs(): VillageNpcDef[] {
  if (cachedNpcs) return cachedNpcs

  const plazaLoop = getPlazaRingPath()
  const trackLoop = getFacilityPath('track')
  const { cx, cy } = PLAZA_HUB

  cachedNpcs = [
    {
      id: 'npc-plaza-walk',
      path: plazaLoop,
      dur: 22,
      delay: 0,
      ...NPCS[0],
      scale: 1.35,
    },
    {
      id: 'npc-track-run',
      path: trackLoop,
      dur: 16,
      delay: 3,
      ...NPCS[1],
      scale: 1.3,
    },
    {
      id: 'npc-plaza-guide',
      path: [[cx + 64, cy + 42] as [number, number]],
      dur: 0,
      delay: 0,
      ...NPCS[2],
      scale: 1.4,
      static: true,
      bubble: '운동하면 마을이 자라요',
    },
  ]

  return cachedNpcs
}

export function pathToSvgD(points: [number, number][]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')}`
}
