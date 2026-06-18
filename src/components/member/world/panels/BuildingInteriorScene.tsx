import { VILLAGE_BUILDING_INTERIOR } from '../data/villageAssets'
import type { WorldBuildingKey } from '../data/worldLayout'

type Props = {
  buildingKey: WorldBuildingKey
  isBuilt: boolean
  isActive: boolean
  className?: string
}

export function BuildingInteriorScene({
  buildingKey,
  isBuilt,
  isActive,
  className = '',
}: Props) {
  const src = VILLAGE_BUILDING_INTERIOR[buildingKey]

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 border-charcoal/15 bg-[#b8dff0] ${className}`}
      style={{ minHeight: 168 }}
    >
      <img
        src={src}
        alt=""
        className={`h-full w-full object-cover transition ${
          isBuilt ? (isActive ? 'opacity-100' : 'opacity-90') : 'opacity-35 grayscale'
        }`}
        draggable={false}
      />

      {isActive && isBuilt && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#5a9e6f] px-2 py-0.5 text-[10px] font-bold text-white shadow">
          운영 중
        </div>
      )}
      {!isBuilt && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-charcoal/30">
          <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-semibold text-charcoal">
            아직 건설되지 않았어요
          </span>
        </div>
      )}
    </div>
  )
}
