import { GROWTH_TREE_EMOJI } from '../../../../types/growth'

type Props = {
  treeStageKey: string
  treeStageName: string
  totalGrowth: number
  progressPercent: number
  nextStageName: string | null
  growthUntilNext: number
  builtFacilityCount: number
  exerciseEventsSinceCollect: number
}

export function VillageHudBar({
  treeStageKey,
  treeStageName,
  totalGrowth,
  progressPercent,
  nextStageName,
  growthUntilNext,
  builtFacilityCount,
  exerciseEventsSinceCollect,
}: Props) {
  const emoji = GROWTH_TREE_EMOJI[treeStageKey as keyof typeof GROWTH_TREE_EMOJI] ?? '🌱'
  const isWorldActive = exerciseEventsSinceCollect > 0

  return (
    <header
      className="rounded-lg border border-white/10 bg-[#0f1a10]/78 px-2.5 py-1.5 shadow-lg backdrop-blur-md"
      aria-label="내 운동 세계"
    >
      <div className="flex items-center gap-2">
        <span className="text-base leading-none" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-cream">
            운동 → 성장치 → 나무 성장 → 세계 확장
          </p>
          <div className="mt-0.5 flex items-baseline justify-between gap-2">
            <p className="truncate text-[10px] text-cream/60">
              {treeStageName}
              {builtFacilityCount > 0 && ` · 열린 공간 ${builtFacilityCount}`}
              {isWorldActive && ' · 운동 반영 중'}
            </p>
            <p className="shrink-0 text-[10px] tabular-nums font-semibold text-[#9AEA72]">
              {totalGrowth.toLocaleString()}
            </p>
          </div>
          {nextStageName && (
            <>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-[#5a9e6f] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-0.5 truncate text-[9px] text-cream/50">
                다음 {nextStageName}까지 {growthUntilNext.toLocaleString()}
              </p>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
