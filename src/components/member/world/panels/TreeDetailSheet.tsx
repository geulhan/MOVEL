import { GROWTH_TREE_EMOJI } from '../../../../types/growth'

type Props = {
  treeStageKey: string
  treeStageName: string
  totalGrowth: number
  progressPercent: number
  nextStageName: string | null
  growthUntilNext: number
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
  open,
  onClose,
}: Props) {
  if (!open) return null

  const emoji = GROWTH_TREE_EMOJI[treeStageKey as keyof typeof GROWTH_TREE_EMOJI] ?? '🌱'

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-40 max-h-[38vh] rounded-t-2xl border-t border-[#5a9e6f]/30 bg-cream px-4 pb-6 pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-charcoal/20" />
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {emoji}
          </span>
          <div>
            <h3 className="text-lg font-bold text-charcoal">운동나무 · {treeStageName}</h3>
            <p className="text-sm text-muted">
              성장치 {totalGrowth.toLocaleString()}
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
        <p className="mt-3 text-xs leading-relaxed text-muted">
          운동하면 나무가 자라고, 단계마다 마을에 새 시설이 열립니다.
        </p>
      </div>
    </>
  )
}
