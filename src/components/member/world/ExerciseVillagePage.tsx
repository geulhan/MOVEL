import { useState } from 'react'
import { btnOutline } from '../../../styles/theme'
import { VillageHudBar } from './hud/VillageHudBar'
import { FacilityOperationStrip } from './hud/FacilityOperationStrip'
import { CollectFloatingButton } from './hud/CollectFloatingButton'
import { BuildingDetailSheet } from './panels/BuildingDetailSheet'
import { TreeDetailSheet } from './panels/TreeDetailSheet'
import { WorldMapViewport } from './WorldMapViewport'
import {
  useVillageWorldState,
  type SelectedWorldTarget,
} from './hooks/useVillageWorldState'
import type { WorldBuildingKey } from './data/worldLayout'

type Props = {
  memberId: string
  refreshToken?: number
}

export function ExerciseVillagePage({ memberId, refreshToken = 0 }: Props) {
  const world = useVillageWorldState(memberId, refreshToken)
  const [selected, setSelected] = useState<SelectedWorldTarget | null>(null)

  if (world.loading) {
    return (
      <div className="flex h-[min(80dvh,520px)] items-center justify-center rounded-2xl bg-[#1a2f1a]/80 text-sm text-cream/70">
        운동 마을을 불러오는 중…
      </div>
    )
  }

  if (world.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <p>{world.error}</p>
        <button
          type="button"
          className={`${btnOutline} mt-3 text-xs`}
          onClick={() => world.reload()}
        >
          다시 시도
        </button>
      </div>
    )
  }

  const selectedBuilding =
    selected?.type === 'building'
      ? world.buildings.find((b) => b.key === selected.key) ?? null
      : null

  return (
    <div className="relative flex flex-col gap-2">
      <VillageHudBar
        treeStageKey={world.treeStageKey}
        treeStageName={world.treeStageName}
        totalGrowth={world.totalGrowth}
        progressPercent={world.progressPercent}
        nextStageName={world.nextStageName}
        growthUntilNext={world.growthUntilNext}
        builtFacilityCount={world.builtFacilityCount}
        exerciseEventsSinceCollect={world.exerciseEventsSinceCollect}
      />

      <div className="relative flex-1">
        <WorldMapViewport
          treeStageKey={world.treeStageKey}
          buildings={world.buildings}
          selected={selected}
          onSelect={setSelected}
        />
        <CollectFloatingButton
          pendingAcorns={world.pendingAcorns}
          visible={world.pendingAcorns > 0}
        />
      </div>

      <FacilityOperationStrip
        buildings={world.buildings}
        exerciseEventsSinceCollect={world.exerciseEventsSinceCollect}
        selectedBuildingKey={selectedBuilding?.key ?? null}
        onSelectBuilding={(key) =>
          setSelected({ type: 'building', key: key as WorldBuildingKey })
        }
      />

      <BuildingDetailSheet
        building={selectedBuilding}
        exerciseEventsSinceCollect={world.exerciseEventsSinceCollect}
        onClose={() => setSelected(null)}
      />

      <TreeDetailSheet
        open={selected?.type === 'tree'}
        treeStageKey={world.treeStageKey}
        treeStageName={world.treeStageName}
        totalGrowth={world.totalGrowth}
        progressPercent={world.progressPercent}
        nextStageName={world.nextStageName}
        growthUntilNext={world.growthUntilNext}
        buildings={world.buildings}
        exerciseEventsSinceCollect={world.exerciseEventsSinceCollect}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
