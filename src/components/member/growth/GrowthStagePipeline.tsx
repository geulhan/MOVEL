import { GROWTH_TREE_EMOJI, type GrowthProfile, type GrowthTreeStageKey } from '../../../types/growth'
import { VILLAGE_UNLOCK_BY_STAGE } from '../../../types/slgVillage'
import { cardClass } from '../../../styles/theme'

type StageRow = {
  stage_key: string
  min_growth: number
  display_name_ko: string
}

type Props = {
  profile: GrowthProfile
  stages: StageRow[]
}

const STAGE_ORDER = ['seed', 'sprout', 'small', 'large', 'sakura']

export function GrowthStagePipeline({ profile, stages }: Props) {
  const ordered = STAGE_ORDER.map((key) => {
    const row = stages.find((s) => s.stage_key === key)
    return {
      key,
      label: row?.display_name_ko ?? key,
      unlock: VILLAGE_UNLOCK_BY_STAGE[key] ?? '',
      min: row?.min_growth ?? 0,
    }
  })

  const currentIdx = STAGE_ORDER.indexOf(profile.current_stage_key)

  return (
    <div className={`${cardClass} p-4`}>
      <p className="text-center text-sm font-semibold text-charcoal">
        운동 → 성장치 → 운동나무 → 마을 건설 · 강화 → 수거
      </p>
      <div className="mt-4 overflow-x-auto pb-1">
        <ol className="flex min-w-[320px] items-start justify-between gap-1 px-1">
          {ordered.map((stage, idx) => {
            const isPast = idx < currentIdx
            const isCurrent = idx === currentIdx
            const isFuture = idx > currentIdx
            const emoji = GROWTH_TREE_EMOJI[stage.key as GrowthTreeStageKey] ?? '🌱'

            return (
              <li
                key={stage.key}
                className={`flex flex-1 flex-col items-center text-center ${
                  isCurrent ? 'scale-105' : ''
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-xl transition ${
                    isCurrent
                      ? 'bg-[#5A9E6F] text-white shadow-md ring-4 ring-[#5A9E6F]/25'
                      : isPast
                        ? 'bg-[#5A9E6F]/20 text-charcoal'
                        : 'bg-charcoal/8 text-charcoal/40'
                  }`}
                  aria-hidden
                >
                  {emoji}
                </div>
                <p
                  className={`mt-1.5 text-[11px] font-bold leading-tight ${
                    isCurrent ? 'text-[#2d6a3e]' : isFuture ? 'text-muted' : 'text-charcoal'
                  }`}
                >
                  {stage.label}
                </p>
                {stage.unlock && stage.unlock !== '건물 없음' && (
                  <p className="mt-0.5 text-[9px] leading-tight text-muted">
                    {stage.unlock}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
        <div className="mx-6 mt-1 flex">
          {ordered.slice(0, -1).map((stage, idx) => (
            <div
              key={`line-${stage.key}`}
              className={`h-1 flex-1 rounded-full ${
                idx < currentIdx ? 'bg-[#5A9E6F]' : 'bg-charcoal/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
