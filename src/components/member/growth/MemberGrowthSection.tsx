import { useMemo } from 'react'
import { formatDate } from '../../api/members'
import { GROWTH_EVENT_LABELS, GROWTH_TREE_EMOJI } from '../../types/growth'
import type { GrowthProfile } from '../../types/growth'
import { useGrowthProfile } from '../../hooks/useGrowthProfile'
import { cardClass } from '../../styles/theme'

type Props = {
  memberId: string
  refreshToken?: number
}

function formatGrowth(n: number): string {
  return n.toLocaleString()
}

function growthProgressPercent(profile: GrowthProfile): number {
  if (profile.is_max_stage || profile.next_stage_key == null) return 100
  const currentMin = profile.tree.current_min_growth
  const nextMin = profile.tree.next_min_growth ?? profile.total_growth
  if (nextMin <= currentMin) return 100
  const p =
    ((profile.total_growth - currentMin) / (nextMin - currentMin)) * 100
  return Math.min(100, Math.max(0, Math.round(p)))
}

export function MemberGrowthSection({ memberId, refreshToken = 0 }: Props) {
  const { profile, loading, error, reload } = useGrowthProfile(
    memberId,
    refreshToken,
  )

  const progress = useMemo(
    () => (profile ? growthProgressPercent(profile) : 0),
    [profile],
  )

  const treeEmoji = profile
    ? GROWTH_TREE_EMOJI[profile.current_stage_key] ?? '🌱'
    : '🌱'

  if (loading) {
    return <p className="text-sm text-muted">성장 정보를 불러오는 중…</p>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <p>{error}</p>
        <p className="mt-2 text-xs text-red-600/80">
          Supabase에서 migration_078_platform_growth_mvp.sql 실행 후 다시 시도해
          주세요.
        </p>
        <button
          type="button"
          onClick={() => void reload()}
          className="mt-3 text-xs font-semibold underline"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="space-y-4">
      <section className={`${cardClass} p-4`}>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[#5A9E6F]/30 bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold text-muted">성장치</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-charcoal">
              {formatGrowth(profile.total_growth)}
            </p>
          </div>
          <div className="rounded-xl border border-gold/25 bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold text-muted">마일</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-charcoal">
              {formatGrowth(profile.current_mile)}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold text-muted">도토리</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-charcoal">
              {formatGrowth(profile.current_acorns)}
            </p>
          </div>
        </div>
      </section>

      <section
        className={`${cardClass} overflow-hidden`}
        style={{
          background:
            'linear-gradient(180deg, #B8D4E8 0%, #9DCE8E 35%, #7CB86A 100%)',
        }}
      >
        <div className="flex flex-col items-center px-4 py-8">
          <span
            className="select-none text-[5.5rem] leading-none drop-shadow-sm"
            role="img"
            aria-label={profile.current_stage_name}
          >
            {treeEmoji}
          </span>
          <p className="mt-3 text-lg font-bold text-charcoal">
            {profile.current_stage_name}
          </p>
          {!profile.is_max_stage && profile.next_stage_name && (
            <>
              <div className="mt-4 h-3 w-full max-w-xs overflow-hidden rounded-full bg-white/60">
                <div
                  className="h-full rounded-full bg-[#5A9E6F] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-center text-sm text-charcoal/80">
                다음 단계 <strong>{profile.next_stage_name}</strong>까지{' '}
                <strong className="tabular-nums">
                  {formatGrowth(profile.growth_until_next)}
                </strong>
                성장치 남음
              </p>
            </>
          )}
          {profile.is_max_stage && (
            <p className="mt-2 text-sm font-medium text-charcoal/75">
              최고 단계에 도달했어요
            </p>
          )}
        </div>
      </section>

      <section className={`${cardClass} p-4`}>
        <h3 className="text-base font-semibold text-charcoal">최근 성장</h3>
        {profile.recent_growth.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            아직 기록이 없어요. PT 출석이나 운동일지를 작성하면 성장치가
            쌓여요.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gold/15">
            {profile.recent_growth.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-charcoal">
                    {GROWTH_EVENT_LABELS[row.event_type] ?? row.event_type}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(row.created_at.slice(0, 10))}
                    {row.source ? ` · ${row.source}` : ''}
                  </p>
                </div>
                <span className="shrink-0 font-bold tabular-nums text-[#5A9E6F]">
                  +{row.growth_amount} 성장치
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-dashed border-gold/40 bg-white/70 px-4 py-3 text-center text-xs text-muted">
        <p className="font-medium text-charcoal/70">정원 · 마을 (준비 중)</p>
        <p className="mt-1">도토리로 공간을 꾸밀 수 있게 될 예정이에요</p>
      </section>

      <p className="text-center text-xs text-muted">
        센터를 옮겨도 운동나무는 계속 자라요
      </p>
    </div>
  )
}
