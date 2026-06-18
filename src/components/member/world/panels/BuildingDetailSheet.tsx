import { UNLOCK_STAGE_LABEL } from '../data/worldLayout'
import type { WorldBuildingState } from '../hooks/useVillageWorldState'

type Props = {
  building: WorldBuildingState | null
  onClose: () => void
}

export function BuildingDetailSheet({ building, onClose }: Props) {
  if (!building) return null

  const unlockLabel = UNLOCK_STAGE_LABEL[building.unlockStageKey] ?? building.unlockStageKey

  let statusLine = ''
  if (!building.isUnlocked) {
    statusLine = `${unlockLabel} 단계에서 해금됩니다`
  } else if (!building.isBuilt) {
    statusLine = '해금됨 · 건설 대기 중'
  } else {
    statusLine = `운영 중 · Lv.${building.level}`
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-40 max-h-[42vh] rounded-t-2xl border-t border-gold/20 bg-cream px-4 pb-6 pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-charcoal/20" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-charcoal">{building.title}</h3>
            <p className="mt-0.5 text-sm text-[#2d6a3e]">{statusLine}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-muted hover:bg-charcoal/5"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-charcoal/85">
          {building.description}
        </p>
        {building.isUnlocked && !building.isBuilt && (
          <p className="mt-3 text-xs text-muted">
            도토리로 건설하면 마을이 발전합니다. (건설은 다음 단계에서 연결됩니다)
          </p>
        )}
        {building.isBuilt && (
          <p className="mt-3 text-xs text-muted">
            운동 기록이 있을 때 도토리를 모읍니다. 방치만으로는 성장하지 않아요.
          </p>
        )}
      </div>
    </>
  )
}
