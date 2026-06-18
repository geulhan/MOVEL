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
    <header className="rounded-xl border border-[#5a9e6f]/25 bg-charcoal/95 px-3 py-2 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-bold text-cream">
              {isWorldActive ? '내 운동 세계 · 운영 중' : '내 운동 세계'}
            </p>
            <p className="shrink-0 text-xs tabular-nums text-cream/75">
              {totalGrowth.toLocaleString()} 성장치
            </p>
          </div>
          <p className="truncate text-[11px] text-cream/60">
            {treeStageName}
            {builtFacilityCount > 0 && ` · 시설 ${builtFacilityCount}개`}
            {isWorldActive && ' · 운동 활성'}
          </p>
          {nextStageName ? (
            <>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-[#5a9e6f] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-0.5 truncate text-[11px] text-cream/65">
                다음 {nextStageName}까지 {growthUntilNext.toLocaleString()}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-[11px] text-cream/65">최고 단계에 도달했어요</p>
          )}
        </div>
      </div>
    </header>
  )
}
