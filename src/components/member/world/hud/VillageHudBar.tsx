import { GROWTH_TREE_EMOJI } from '../../../../types/growth'

type Props = {
  treeStageKey: string
  treeStageName: string
  totalGrowth: number
  currentMile: number
  currentAcorns: number
  progressPercent: number
  nextStageName: string | null
  growthUntilNext: number
  builtFacilityCount: number
  exerciseEventsSinceCollect: number
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-md bg-white/8 px-2 py-1">
      <span className="text-[9px] text-cream/55">{label}</span>
      <span
        className="truncate text-[11px] font-bold tabular-nums"
        style={{ color: accent ?? '#f5f0e6' }}
      >
        {value}
      </span>
    </div>
  )
}

export function VillageHudBar({
  treeStageKey,
  treeStageName,
  totalGrowth,
  currentMile,
  currentAcorns,
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
      className="rounded-xl border border-[#5a9e6f]/35 bg-gradient-to-b from-[#142810]/92 to-[#0f1a10]/88 px-2.5 py-2 shadow-lg backdrop-blur-md"
      aria-label="내 운동 세계"
    >
      <div className="flex items-start gap-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5a9e6f]/20 text-lg"
          aria-hidden
        >
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-cream">운동하면 마을이 자라요</p>
          <p className="mt-0.5 truncate text-[10px] text-cream/60">
            {treeStageName}
            {builtFacilityCount > 0 && ` · 열린 공간 ${builtFacilityCount}`}
            {isWorldActive && (
              <span className="text-[#9AEA72]"> · 운동 반영 중</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <StatChip
          label="성장치"
          value={totalGrowth.toLocaleString()}
          accent="#9AEA72"
        />
        <StatChip
          label="마일"
          value={currentMile.toLocaleString()}
          accent="#ffd54f"
        />
        <StatChip
          label="씨앗"
          value={currentAcorns.toLocaleString()}
          accent="#ffcc80"
        />
      </div>

      {nextStageName && (
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2 text-[9px] text-cream/55">
            <span>다음 {nextStageName}</span>
            <span className="tabular-nums">{growthUntilNext.toLocaleString()} 남음</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#5a9e6f] to-[#9AEA72] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </header>
  )
}
