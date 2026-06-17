import { useState } from 'react'
import { formatDate } from '../../../api/members'
import { claimSeasonReward } from '../../../api/season'
import { formatSupabaseError } from '../../../lib/errors'
import { useSeasonPass } from '../../../hooks/useSeasonPass'
import type { SeasonReward } from '../../../types/season'
import { btnOutline, btnPrimary, cardClass } from '../../../styles/theme'
import { GardenPixelSprite } from '../garden/GardenPixelSprite'

type Props = {
  memberId: string
  refreshToken?: number
}

function seasonProgressPercent(
  seasonXp: number,
  nextXp: number | null,
  prevXp: number,
): number {
  if (nextXp == null) return 100
  const span = nextXp - prevXp
  if (span <= 0) return 100
  return Math.min(100, Math.max(0, Math.round(((seasonXp - prevXp) / span) * 100)))
}

function rewardLabel(reward: SeasonReward): string {
  if (reward.reward_type === 'acorns' && reward.reward_acorns > 0) {
    return `도토리 ${reward.reward_acorns}개`
  }
  return reward.description || reward.title
}

export function MemberSeasonSection({ memberId, refreshToken = 0 }: Props) {
  const { state, loading, error, reload, setState } = useSeasonPass(memberId, refreshToken)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleClaim(rewardId: string) {
    setClaimingId(rewardId)
    setActionError(null)
    try {
      const next = await claimSeasonReward(memberId, rewardId)
      setState(next)
    } catch (err) {
      setActionError(formatSupabaseError(err))
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) {
    return (
      <div className={`${cardClass} p-6 text-center text-sm text-muted`}>
        시즌 패스를 불러오는 중…
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${cardClass} border-red-200 bg-red-50 p-4`}>
        <p className="text-sm font-medium text-red-800">{error}</p>
        <p className="mt-2 text-xs text-red-600/80">
          Supabase에서 migration_086_season_pass_mvp.sql 실행 후 다시 시도해 주세요.
        </p>
        <button type="button" className={`${btnOutline} mt-3 text-sm`} onClick={() => void reload()}>
          다시 시도
        </button>
      </div>
    )
  }

  if (!state?.has_active_season || !state.season || !state.progress) {
    return (
      <section className={`${cardClass} p-6 text-center`}>
        <p className="text-4xl">🌤️</p>
        <p className="mt-3 text-base font-semibold text-charcoal">진행 중인 시즌이 없어요</p>
        <p className="mt-2 text-sm text-muted">
          센터에서 새 시즌이 열리면 운동·출석·일지로 시즌 경험치를 모을 수 있어요.
        </p>
      </section>
    )
  }

  const { season, progress, rewards } = state
  const next = progress.next_reward
  const prevXp =
    rewards
      .filter((r) => r.xp_required <= progress.season_xp)
      .sort((a, b) => b.level - a.level)[0]?.xp_required ?? 0
  const progressPct = seasonProgressPercent(
    progress.season_xp,
    next?.xp_required ?? null,
    prevXp,
  )

  return (
    <div className="space-y-4">
      <section
        className={`${cardClass} overflow-hidden`}
        style={{
          background: 'linear-gradient(135deg, #B8D4E8 0%, #F5D9A8 50%, #9DCE8E 100%)',
        }}
      >
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-charcoal/70">
            무료 시즌 패스
          </p>
          <h3 className="mt-1 text-xl font-bold text-charcoal">{season.title}</h3>
          <p className="mt-1 text-sm text-charcoal/80">
            {formatDate(season.start_date)} ~ {formatDate(season.end_date)}
          </p>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-charcoal/80">현재 레벨</p>
              <p className="text-4xl font-bold tabular-nums text-charcoal">
                LV{progress.current_level}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-charcoal/80">시즌 XP</p>
              <p className="text-2xl font-bold tabular-nums text-charcoal">
                {progress.season_xp.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-3 overflow-hidden rounded-full bg-white/50">
              <div
                className="h-full rounded-full bg-charcoal transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {next ? (
              <p className="mt-2 text-xs text-charcoal/80">
                다음 보상 <strong>{next.title}</strong>까지{' '}
                <strong className="tabular-nums">
                  {(next.xp_required - progress.season_xp).toLocaleString()}
                </strong>{' '}
                XP
              </p>
            ) : (
              <p className="mt-2 text-xs font-semibold text-charcoal">시즌 최고 레벨 달성!</p>
            )}
          </div>
        </div>
      </section>

      <section className={`${cardClass} p-4`}>
        <h3 className="text-base font-semibold text-charcoal">시즌 보상 트랙</h3>
        <p className="mt-1 text-xs text-muted">
          시즌 XP는 성장치와 별개이며, 시즌 종료 시 초기화됩니다
        </p>
        {actionError && <p className="mt-2 text-sm text-red-700">{actionError}</p>}
        <ul className="mt-3 space-y-2">
          {rewards.map((reward) => {
            const unlocked = reward.is_unlocked
            const claimed = reward.is_claimed
            return (
              <li
                key={reward.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                  claimed
                    ? 'border-charcoal/10 bg-charcoal/5 opacity-70'
                    : unlocked
                      ? 'border-[#5A9E6F]/40 bg-[#5A9E6F]/5'
                      : 'border-gold/20 bg-white'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream text-lg">
                  {reward.sprite_key ? (
                    <GardenPixelSprite spriteKey={reward.sprite_key} scale={1} />
                  ) : (
                    <span>{reward.icon}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-charcoal">
                    LV{reward.level} · {reward.title}
                  </p>
                  <p className="text-xs text-muted">{rewardLabel(reward)}</p>
                  <p className="text-[11px] text-muted tabular-nums">
                    {reward.xp_required.toLocaleString()} XP 필요
                  </p>
                </div>
                {claimed ? (
                  <span className="shrink-0 text-xs font-bold text-muted">수령 완료</span>
                ) : unlocked ? (
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={claimingId === reward.id}
                    onClick={() => void handleClaim(reward.id)}
                  >
                    {claimingId === reward.id ? '…' : '받기'}
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-muted">🔒</span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {state.xp_rules.length > 0 && (
        <section className={`${cardClass} p-4`}>
          <h3 className="text-base font-semibold text-charcoal">시즌 XP 획득 방법</h3>
          <ul className="mt-3 divide-y divide-gold/15">
            {state.xp_rules.map((rule) => (
              <li
                key={rule.event_type}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="text-charcoal">{rule.display_name_ko}</span>
                <span className="font-bold tabular-nums text-[#5A9E6F]">
                  +{rule.xp_amount} XP
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
