import {
  BUILDING_OPERATIONS,
  operatingProgress,
  productionRateForLevel,
} from '../data/buildingOperations'
import { UNLOCK_STAGE_LABEL } from '../data/worldLayout'
import { BuildingInteriorScene } from './BuildingInteriorScene'
import type { WorldBuildingState } from '../hooks/useVillageWorldState'

type Props = {
  building: WorldBuildingState | null
  exerciseEventsSinceCollect: number
  onClose: () => void
}

export function BuildingDetailSheet({
  building,
  exerciseEventsSinceCollect,
  onClose,
}: Props) {
  if (!building) return null

  const ops = BUILDING_OPERATIONS[building.key]
  const unlockLabel = UNLOCK_STAGE_LABEL[building.unlockStageKey] ?? building.unlockStageKey
  const isActive = building.isBuilt && exerciseEventsSinceCollect > 0
  const baseRate = building.productionRatePerHour ?? 2
  const prodRate = productionRateForLevel(baseRate, building.level)
  const progress = operatingProgress(isActive, building.level)

  let statusLabel = ''
  if (!building.isUnlocked) {
    statusLabel = `${unlockLabel} 단계에 해금`
  } else if (!building.isBuilt) {
    statusLabel = '건설 대기 · 도토리로 발전 가능'
  } else if (isActive) {
    statusLabel = '운동 연동 · 운영 중'
  } else {
    statusLabel = '대기 중 · 운동하면 활성화'
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 bg-black/45"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-40 max-h-[min(72dvh,520px)] overflow-y-auto rounded-t-2xl border-t-2 border-charcoal/10 bg-cream shadow-2xl">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-charcoal/20" />

        <div className="px-4 pb-6 pt-2">
          <BuildingInteriorScene
            buildingKey={building.key}
            isBuilt={building.isBuilt}
            isActive={isActive}
            className="w-full"
          />

          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-charcoal">{building.title}</h3>
              <p className="mt-0.5 text-sm font-medium text-[#2d6a3e]">{statusLabel}</p>
            </div>
            {building.isBuilt && (
              <span className="shrink-0 rounded-lg bg-charcoal px-2.5 py-1 text-sm font-bold text-cream">
                Lv.{building.level}
              </span>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-gold/20 bg-white p-3">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{ops.activityTitle}</span>
              {building.isBuilt && (
                <span className="font-bold text-amber-700">
                  🌰 {isActive ? `${prodRate}/시간` : '운동 대기'}
                </span>
              )}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-charcoal/10">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isActive ? 'bg-[#5a9e6f]' : 'bg-charcoal/25'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-charcoal/85">{ops.activityDetail}</p>
            <p className="mt-1 text-xs text-muted">연동: {ops.linkedExercise}</p>
          </div>

          {!building.isUnlocked && (
            <p className="mt-3 text-sm text-muted">
              운동나무가 {unlockLabel} 단계가 되면 이 시설이 열립니다.
            </p>
          )}
          {building.isUnlocked && !building.isBuilt && (
            <p className="mt-3 text-sm text-muted">
              도토리로 건설하면 내 운동 세계에 이 공간이 생깁니다.
            </p>
          )}
          {building.isBuilt && !isActive && (
            <p className="mt-3 text-sm text-amber-800/90">{ops.idleMessage}</p>
          )}

          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-charcoal/15 bg-white py-2.5 text-sm font-semibold text-charcoal hover:bg-charcoal/5"
            onClick={onClose}
          >
            마을로 돌아가기
          </button>
        </div>
      </div>
    </>
  )
}
