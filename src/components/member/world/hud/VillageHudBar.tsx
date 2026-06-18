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
      className="rounded-lg border border-white/10 bg-[#0f1a10]/75 px-2.5 py-1.5 shadow-lg backdrop-blur-md"
      aria-label="운동 왕국 현황"
    >
      <div className="flex items-center gap-2">
        <span className="text-base leading-none" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-xs font-bold text-cream">
              {isWorldActive ? '작은 왕국 · 운영 중' : '운동으로 자라는 작은 왕국'}
            </p>
            <p className="shrink-0 text-[10px] tabular-nums text-cream/70">
              {totalGrowth.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="truncate text-[10px] text-cream/55">
              {treeStageName}
              {builtFacilityCount > 0 && ` · 시설 ${builtFacilityCount}`}
            </p>
            {nextStageName && (
              <div className="ml-auto hidden min-w-[72px] flex-1 sm:block">
                <div className="h-1 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full bg-[#5a9e6f]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          {nextStageName && (
            <p className="mt-0.5 truncate text-[9px] text-cream/50 sm:hidden">
              {nextStageName}까지 {growthUntilNext.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </header>
  )
}
