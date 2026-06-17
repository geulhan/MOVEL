import type { GrowthProfile } from '../../../types/growth'
import { VILLAGE_UNLOCK_BY_STAGE } from '../../../types/slgVillage'
import { cardClass } from '../../../styles/theme'

type Props = {
  profile: GrowthProfile
}

function formatGrowth(n: number): string {
  return n.toLocaleString()
}

export function GrowthNextGoalCard({ profile }: Props) {
  const nextUnlock =
    profile.next_stage_key != null
      ? VILLAGE_UNLOCK_BY_STAGE[profile.next_stage_key]
      : null

  if (profile.is_max_stage) {
    return (
      <div className={`${cardClass} border-[#5A9E6F]/30 bg-[#5A9E6F]/8 p-4`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#5A9E6F]">
          다음 목표
        </p>
        <p className="mt-1 text-base font-bold text-charcoal">
          벚꽃나무 최고 단계에 도달했어요
        </p>
        <p className="mt-1 text-sm text-muted">
          운동을 이어가며 마을을 더 발전시켜 보세요.
        </p>
      </div>
    )
  }

  return (
    <div className={`${cardClass} border-gold/25 bg-gradient-to-br from-white to-cream/60 p-4`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
        다음 목표
      </p>
      <p className="mt-1 text-lg font-bold text-charcoal">
        {profile.next_stage_name}까지{' '}
        <span className="tabular-nums text-[#5A9E6F]">
          {formatGrowth(profile.growth_until_next)}
        </span>
        성장치
      </p>
      {nextUnlock && nextUnlock !== '건물 없음' && (
        <p className="mt-2 text-sm text-charcoal/85">
          도달 시 마을에 <strong>{nextUnlock}</strong>이 열려요
        </p>
      )}
      {(!nextUnlock || nextUnlock === '건물 없음') && profile.next_stage_name && (
        <p className="mt-2 text-sm text-muted">
          운동나무가 한 단계 더 자랍니다
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        PT · 수업 · 운동일지 · 걸음 인증으로 성장치를 모을 수 있어요
      </p>
    </div>
  )
}
