import { useMemo } from 'react'
import { useGrowthProfile } from '../../../../hooks/useGrowthProfile'
import { useSlgVillage } from '../../../../hooks/useSlgVillage'
import type { SlgVillageSlot } from '../../../../types/slgVillage'
import {
  isStageUnlocked,
  WORLD_BUILDINGS,
  type WorldBuildingDef,
  type WorldBuildingKey,
} from '../data/worldLayout'

export type WorldBuildingState = WorldBuildingDef & {
  isUnlocked: boolean
  isBuilt: boolean
  level: number
}

export type VillageWorldState = {
  loading: boolean
  error: string | null
  treeStageKey: string
  treeStageName: string
  totalGrowth: number
  growthUntilNext: number
  nextStageName: string | null
  progressPercent: number
  currentAcorns: number
  pendingAcorns: number
  buildings: WorldBuildingState[]
  reload: () => void
}

function growthProgressPercent(
  total: number,
  currentMin: number,
  nextMin: number | null,
  isMax: boolean,
): number {
  if (isMax || nextMin == null || nextMin <= currentMin) return 100
  const p = ((total - currentMin) / (nextMin - currentMin)) * 100
  return Math.min(100, Math.max(0, Math.round(p)))
}

function slotByLegacyKey(
  slots: SlgVillageSlot[],
  legacyKey: string | undefined,
): SlgVillageSlot | undefined {
  if (!legacyKey) return undefined
  return slots.find((s) => s.slot_key === legacyKey)
}

export function useVillageWorldState(
  memberId: string | undefined,
  refreshToken = 0,
): VillageWorldState {
  const growth = useGrowthProfile(memberId, refreshToken)
  const village = useSlgVillage(memberId, refreshToken)

  const buildings = useMemo((): WorldBuildingState[] => {
    const stageKey = growth.profile?.current_stage_key ?? 'seed'
    const slots = village.state?.slots ?? []

    return WORLD_BUILDINGS.map((def) => {
      const legacy = slotByLegacyKey(slots, def.legacyDbSlotKey)
      const unlocked = isStageUnlocked(stageKey, def.unlockStageKey)
      const built = legacy?.is_built ?? false
      const level = legacy?.is_built ? legacy.level : 0

      return {
        ...def,
        isUnlocked: unlocked,
        isBuilt: built,
        level,
      }
    })
  }, [growth.profile?.current_stage_key, village.state?.slots])

  const profile = growth.profile
  const tree = profile?.tree
  const progressPercent = profile
    ? growthProgressPercent(
        profile.total_growth,
        tree?.current_min_growth ?? 0,
        tree?.next_min_growth ?? null,
        profile.is_max_stage,
      )
    : 0

  const loading = growth.loading || village.loading
  const error = growth.error ?? village.error

  return {
    loading,
    error,
    treeStageKey: profile?.current_stage_key ?? 'seed',
    treeStageName: profile?.current_stage_name ?? '씨앗',
    totalGrowth: profile?.total_growth ?? village.state?.total_growth ?? 0,
    growthUntilNext: profile?.growth_until_next ?? 0,
    nextStageName: profile?.next_stage_name ?? null,
    progressPercent,
    currentAcorns: village.state?.current_acorns ?? 0,
    pendingAcorns: village.state?.production?.pending_acorns ?? 0,
    buildings,
    reload: () => {
      void growth.reload()
      void village.reload()
    },
  }
}

export type SelectedWorldTarget =
  | { type: 'tree' }
  | { type: 'building'; key: WorldBuildingKey }
