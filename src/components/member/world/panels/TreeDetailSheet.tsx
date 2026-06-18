import { GROWTH_TREE_EMOJI } from '../../../../types/growth'
import { BUILDING_OPERATIONS } from '../data/buildingOperations'
import type { WorldBuildingState } from '../hooks/useVillageWorldState'

type Props = {
  treeStageKey: string
  treeStageName: string
  totalGrowth: number
  progressPercent: number
  nextStageName: string | null
  growthUntilNext: number
  buildings: WorldBuildingState[]
  exerciseEventsSinceCollect: number
  open: boolean
  onClose: () => void
}

export function TreeDetailSheet({
  treeStageKey,
  treeStageName,
  totalGrowth,
  progressPercent,
  nextStageName,
  growthUntilNext,
  buildings,
  exerciseEventsSinceCollect,
  open,
  onClose,
}: Props) {
  if (!open) return null

  const emoji = GROWTH_TREE_EMOJI[treeStageKey as keyof typeof GROWTH_TREE_EMOJI] ?? '🌱'
  const built = buildings.filter((b) => b.isBuilt)
  const isWorldActive = exerciseEventsSinceCollect > 0

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-40 max-h-[48vh] overflow-y-auto rounded-t-2xl border-t border-[#5a9e6f]/30 bg-cream px-4 pb-6 pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-charcoal/20" />
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {emoji}
          </span>
          <div>
            <h3 className="text-lg font-bold text-charcoal">내 운동 세계 · {treeStageName}</h3>
            <p className="text-sm text-muted">
              성장치 {totalGrowth.toLocaleString()}
              {isWorldActive && ' · 운영 중'}
            </p>
          </div>
        </div>
        {nextStageName && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted">
              <span>{treeStageName}</span>
              <span>{nextStageName}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-charcoal/10">
              <div
                className="h-full rounded-full bg-[#5a9e6f]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-charcoal/80">
              {nextStageName}까지 {growthUntilNext.toLocaleString()} 성장치
            </p>
          </div>
        )}
        {built.length > 0 && (
          <div className="mt-4 rounded-xl border border-gold/20 bg-white p-3">
            <p className="text-xs font-semibold text-charcoal">운영 중인 시설</p>
            <ul className="mt-2 space-y-1.5">
              {built.map((b) => (
                <li key={b.key} className="flex items-center justify-between text-xs">
                  <span className="text-charcoal/90">
                    {b.title} · {BUILDING_OPERATIONS[b.key].activityTitle}
                  </span>
                  <span className="font-bold text-[#2d6a3e]">
                    {b.isOperating ? `Lv.${b.level}` : '대기'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          운동하면 나무가 자라고, 시설이 운영됩니다. 도토리로 마을을 발전시키세요.
        </p>
      </div>
    </>
  )
}
