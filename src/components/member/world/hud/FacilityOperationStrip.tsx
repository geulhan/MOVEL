import {
  BUILDING_OPERATIONS,
  operatingProgress,
  productionRateForLevel,
} from '../data/buildingOperations'
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
      className="rounded-xl border border-[#5a9e6f]/20 bg-charcoal/90 px-2 py-2 shadow-inner"
      aria-label="시설 운영 현황"
    >
      <div className="mb-1.5 flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold text-cream/80">시설 운영</p>
        <p className="text-[10px] text-cream/55">
          {globalActive ? '운동 연동 중' : '운동하면 활성화'}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((b) => {
          const ops = BUILDING_OPERATIONS[b.key]
          const isActive = b.isBuilt && globalActive
          const rate = productionRateForLevel(b.productionRatePerHour, b.level)
          const progress = operatingProgress(isActive, b.level)
          const selected = selectedBuildingKey === b.key

          return (
            <button
              key={b.key}
              type="button"
              onClick={() => onSelectBuilding(b.key)}
              className={`min-w-[148px] shrink-0 rounded-lg border px-2.5 py-2 text-left transition ${
                selected
                  ? 'border-gold bg-cream'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`truncate text-xs font-bold ${
                    selected ? 'text-charcoal' : 'text-cream'
                  }`}
                >
                  {b.shortLabel}
                </span>
                {b.isBuilt ? (
                  <span
                    className={`shrink-0 text-[10px] font-bold ${
                      selected ? 'text-[#2d6a3e]' : 'text-[#8ecf7a]'
                    }`}
                  >
                    Lv.{b.level}
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] text-amber-400">건설 대기</span>
                )}
              </div>
              <p
                className={`mt-0.5 truncate text-[10px] ${
                  selected ? 'text-muted' : 'text-cream/55'
                }`}
              >
                {b.isBuilt ? ops.activityTitle : '발전 가능'}
              </p>
              {b.isBuilt && (
                <>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/20">
                    <div
                      className={`h-full rounded-full ${
                        isActive ? 'bg-[#5a9e6f]' : 'bg-white/25'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p
                    className={`mt-1 text-[10px] font-semibold ${
                      selected ? 'text-amber-700' : 'text-amber-300/90'
                    }`}
                  >
                    {isActive ? `🌰 ${rate}/시간` : '운동 대기'}
                  </p>
                </>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
