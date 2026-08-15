import {
  getFacilityPath,
  getPlazaRingPath,
} from './campusRoads'
import { PLAZA_HUB } from './worldLayout'
import type { NpcCharacterStyle } from '../VillageNpcSprite'

export type VillageNpcDef = {
  id: string
  path: [number, number][]
  dur: number
  delay: number
  style: NpcCharacterStyle
  scale: number
  static?: boolean
  bubble?: string
  waving?: boolean
}

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
      style: 'walker',
      scale: 1.45,
    },
    {
      id: 'npc-track-run',
      path: trackLoop,
      dur: 14,
      delay: 2,
      style: 'runner',
      scale: 1.4,
    },
    {
      id: 'npc-plaza-guide',
      path: [[cx + 64, cy + 42] as [number, number]],
      dur: 0,
      delay: 0,
      style: 'guide',
      scale: 1.5,
      static: true,
      waving: true,
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
