import type { WorldBuildingState } from '../hooks/useVillageWorldState'

type Props = {
  buildings: WorldBuildingState[]
  exerciseEventsSinceCollect: number
  selectedBuildingKey: string | null
  onSelectBuilding: (key: string) => void
}

export function FacilityOperationStrip({
  buildings,
  exerciseEventsSinceCollect,
  selectedBuildingKey,
  onSelectBuilding,
}: Props) {
  const visible = buildings.filter((b) => b.isUnlocked)
  if (visible.length === 0) return null

  const globalActive = exerciseEventsSinceCollect > 0

  return (
    <section
      className="rounded-lg border border-white/10 bg-[#0f1a10]/70 px-1.5 py-1 backdrop-blur-md"
      aria-label="시설 바로가기"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 px-1 text-[9px] font-semibold text-cream/45">
          {globalActive ? '●' : '○'}
        </span>
        {visible.map((b) => {
          const selected = selectedBuildingKey === b.key
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => onSelectBuilding(b.key)}
              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                selected
                  ? 'bg-[#5a9e6f] text-white'
                  : 'bg-white/8 text-cream/75 hover:bg-white/14'
              }`}
            >
              {b.shortLabel}
              {b.isBuilt ? ` Lv.${b.level}` : ' ·건설'}
            </button>
          )
        })}
      </div>
    </section>
  )
}
