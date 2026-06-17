import { useMemo, useState } from 'react'
import {
  DEFAULT_GROWTH_REWARD_RULES,
  GROWTH_EVENT_LABELS,
  GROWTH_TREE_EMOJI,
} from '../../../types/growth'
import type { GrowthProfile, GrowthRewardRule } from '../../../types/growth'
import { useGrowthProfile } from '../../../hooks/useGrowthProfile'
import { MemberChallengesSection } from './MemberChallengesSection'
import { GrowthNextGoalCard } from './GrowthNextGoalCard'
import { GrowthStagePipeline } from './GrowthStagePipeline'
import { MemberVillageSection } from '../village/MemberVillageSection'
import { MotionHubTreeScene } from '../pixel/MotionHubVillageScene'
import { cardClass } from '../../../styles/theme'

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

const EARN_RULE_ORDER = [
  'PT_ATTENDANCE',
  'GROUP_CLASS_ATTENDANCE',
  'WORKOUT_LOG',
  'PHOTO_WORKOUT_LOG',
  'BODY_COMPOSITION',
  'CHALLENGE_COMPLETE',
  'STREAK_7_DAYS',
  'STREAK_30_DAYS',
  'STEPS_3000',
  'STEPS_5000',
  'STEPS_7000',
  'STEPS_10000',
  'STEPS_15000',
]

function sortRewardRules(rules: GrowthRewardRule[]): GrowthRewardRule[] {
  return [...rules].sort((a, b) => {
    const ai = EARN_RULE_ORDER.indexOf(String(a.event_type))
    const bi = EARN_RULE_ORDER.indexOf(String(b.event_type))
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
}

export function MemberGrowthSection({ memberId, refreshToken = 0 }: Props) {
  const { profile, loading, error, reload } = useGrowthProfile(
    memberId,
    refreshToken,
  )
  const [detailsOpen, setDetailsOpen] = useState(false)

  const progress = useMemo(
    () => (profile ? growthProgressPercent(profile) : 0),
    [profile],
  )

  const rewardRules = useMemo(() => {
    if (!profile) return []
    const rules =
      profile.reward_rules.length > 0
        ? profile.reward_rules
        : DEFAULT_GROWTH_REWARD_RULES
    return sortRewardRules(rules)
  }, [profile])

  const treeStages = useMemo(() => {
    if (!profile?.tree_stages.length) {
      return [
        { stage_key: 'seed', min_growth: 100, display_name_ko: '씨앗' },
        { stage_key: 'sprout', min_growth: 500, display_name_ko: '새싹' },
        { stage_key: 'small', min_growth: 1500, display_name_ko: '어린 나무' },
        { stage_key: 'large', min_growth: 5000, display_name_ko: '큰 나무' },
        { stage_key: 'sakura', min_growth: 15000, display_name_ko: '벚꽃나무' },
      ]
    }
    return profile.tree_stages
  }, [profile])

  if (loading) {
    return <p className="text-sm text-muted">성장 정보를 불러오는 중…</p>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <p>{error}</p>
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

  const treeEmoji = GROWTH_TREE_EMOJI[profile.current_stage_key] ?? '🌱'

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#5A9E6F]/25 bg-gradient-to-br from-[#5A9E6F]/12 to-white px-4 py-3 text-center">
        <p className="text-base font-bold leading-snug text-charcoal">
          운동하면 운동나무가 자라고
          <br />
          내 마을이 함께 발전해요
        </p>
      </div>

      {profile.unread_notification_count > 0 && profile.growth_notifications.length > 0 && (
        <section className="rounded-xl border border-[#5A9E6F]/40 bg-[#5A9E6F]/10 px-4 py-3">
          <p className="text-sm font-semibold text-charcoal">새 성장 알림</p>
          <ul className="mt-2 space-y-2">
            {profile.growth_notifications
              .filter((n) => !n.is_read)
              .slice(0, 2)
              .map((n) => (
                <li key={n.id} className="text-sm text-charcoal/90">
                  <span className="mr-1">{n.icon}</span>
                  <span className="font-medium">{n.title}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className={`${cardClass} overflow-hidden`}>
        <div className="bg-charcoal px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-cream/60">
            내 운동나무
          </p>
          <p className="mt-1 flex items-center justify-center gap-2 text-xl font-bold text-cream">
            <span aria-hidden>{treeEmoji}</span>
            {profile.current_stage_name}
          </p>
          <p className="mt-1 text-sm text-cream/80">
            성장치{' '}
            <span className="font-bold tabular-nums">
              {formatGrowth(profile.total_growth)}
            </span>
          </p>
        </div>

        <div className="p-4">
          <MotionHubTreeScene treeStageKey={profile.current_stage_key} />
          {!profile.is_max_stage && profile.next_stage_name && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{profile.current_stage_name}</span>
                <span>{profile.next_stage_name}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-charcoal/10">
                <div
                  className="h-full rounded-full bg-[#5A9E6F] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <GrowthNextGoalCard profile={profile} />

      <GrowthStagePipeline profile={profile} stages={treeStages} />

      <MemberChallengesSection challenges={profile.active_challenges ?? []} />

      <MemberVillageSection memberId={memberId} refreshToken={refreshToken} />

      <section className={`${cardClass} p-4`}>
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setDetailsOpen((v) => !v)}
        >
          <div>
            <h3 className="text-base font-semibold text-charcoal">성장 기록 · 보상 안내</h3>
            <p className="mt-0.5 text-xs text-muted">
              업적, 타임라인, 운동별 성장치
            </p>
          </div>
          <span className="text-sm text-muted">{detailsOpen ? '▲' : '▼'}</span>
        </button>

        {detailsOpen && (
          <div className="mt-4 space-y-6 border-t border-gold/15 pt-4">
            <div>
              <h4 className="text-sm font-bold text-charcoal">운동별 성장 보상</h4>
              <ul className="mt-2 divide-y divide-gold/15">
                {rewardRules.slice(0, 8).map((rule) => (
                  <li
                    key={rule.event_type}
                    className="flex items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="text-charcoal">
                      {rule.display_name_ko ||
                        GROWTH_EVENT_LABELS[rule.event_type] ||
                        rule.event_type}
                    </span>
                    <span className="shrink-0 font-bold text-[#5A9E6F]">
                      +{rule.growth_reward}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {profile.achievements.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-charcoal">업적</h4>
                <ul className="mt-2 space-y-2">
                  {profile.achievements.slice(0, 5).map((item) => (
                    <li
                      key={item.code}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        item.is_unlocked ? 'bg-[#5A9E6F]/8' : 'bg-cream/50'
                      }`}
                    >
                      <span className="mr-1">{item.icon}</span>
                      {item.title}
                      {item.is_unlocked && (
                        <span className="ml-2 text-xs text-[#5A9E6F]">달성</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {profile.growth_timeline.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-charcoal">최근 활동</h4>
                <ul className="mt-2 divide-y divide-gold/15">
                  {profile.growth_timeline.slice(0, 5).map((row) => (
                    <li
                      key={`${row.kind}-${row.id}`}
                      className="flex justify-between gap-2 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-charcoal">{row.title}</span>
                      {row.growth_amount > 0 && (
                        <span className="shrink-0 font-bold text-[#5A9E6F]">
                          +{row.growth_amount}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <p className="text-center text-xs text-muted">
        마일리지 혜택은 리워드 탭에서 확인할 수 있어요
      </p>
    </div>
  )
}
