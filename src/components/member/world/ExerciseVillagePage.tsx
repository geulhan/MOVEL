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
      <div className="flex h-[min(85dvh,720px)] items-center justify-center rounded-2xl bg-[#1a2f1a]/80 text-sm text-cream/70">
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
    <div className="relative flex h-[min(86dvh,900px)] min-h-[460px] flex-col">
      <WorldMapViewport
        className="h-full min-h-0 flex-1"
        treeStageKey={world.treeStageKey}
        buildings={world.buildings}
        selected={selected}
        onSelect={setSelected}
        isWorldActive={world.exerciseEventsSinceCollect > 0}
        exerciseEventsSinceCollect={world.exerciseEventsSinceCollect}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-1.5 pt-1.5">
        <div className="pointer-events-auto">
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
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 px-1.5">
        <div className="pointer-events-auto">
          <FacilityOperationStrip
            buildings={world.buildings}
            exerciseEventsSinceCollect={world.exerciseEventsSinceCollect}
            selectedBuildingKey={selectedBuilding?.key ?? null}
            onSelectBuilding={(key) =>
              setSelected({ type: 'building', key: key as WorldBuildingKey })
            }
          />
        </div>
      </div>

      <CollectFloatingButton
        pendingAcorns={world.pendingAcorns}
        visible={world.pendingAcorns > 0}
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
