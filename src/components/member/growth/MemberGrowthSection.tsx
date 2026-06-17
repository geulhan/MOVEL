import { useMemo } from 'react'
import { formatDate } from '../../../api/members'
import {
  DEFAULT_GROWTH_REWARD_RULES,
  GROWTH_EVENT_LABELS,
  GROWTH_TREE_EMOJI,
} from '../../../types/growth'
import type { GrowthProfile, GrowthRewardRule } from '../../../types/growth'
import { VILLAGE_UNLOCK_BY_STAGE } from '../../../types/slgVillage'
import { useGrowthProfile } from '../../../hooks/useGrowthProfile'
import { MemberChallengesSection } from './MemberChallengesSection'
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

function formatRewardLimit(rule: GrowthRewardRule): string | null {
  if (rule.limit_period === 'monthly' && rule.limit_count) {
    return `월 ${rule.limit_count}회`
  }
  if (rule.limit_period === 'rolling_30d' && rule.limit_count) {
    return '30일 1회'
  }
  return null
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
          Supabase에서 migration_078_platform_growth_mvp.sql,
          migration_081_growth_events_auto_earn.sql,
          migration_083_growth_achievements_notifications.sql,
          migration_084_center_challenges.sql 실행 후 다시 시도해 주세요.
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
      {profile.unread_notification_count > 0 && profile.growth_notifications.length > 0 && (
        <section className="rounded-xl border border-[#5A9E6F]/40 bg-[#5A9E6F]/10 px-4 py-3">
          <p className="text-sm font-semibold text-charcoal">새 성장 알림</p>
          <ul className="mt-2 space-y-2">
            {profile.growth_notifications
              .filter((n) => !n.is_read)
              .slice(0, 3)
              .map((n) => (
                <li key={n.id} className="text-sm text-charcoal/90">
                  <span className="mr-1">{n.icon}</span>
                  <span className="font-medium">{n.title}</span>
                  {n.body ? <span className="text-charcoal/75"> · {n.body}</span> : null}
                  {(n.growth_amount > 0 || n.acorn_amount > 0) && (
                    <span className="mt-0.5 block text-xs text-[#5A9E6F]">
                      {n.growth_amount > 0 ? `+${n.growth_amount} 성장치` : ''}
                      {n.growth_amount > 0 && n.acorn_amount > 0 ? ' · ' : ''}
                      {n.acorn_amount > 0 ? `+${n.acorn_amount} 도토리` : ''}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className={`${cardClass} p-4`}>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[#5A9E6F]/30 bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold text-muted">성장치</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-charcoal">
              {formatGrowth(profile.total_growth)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted">운동할수록 빠르게 쌓여요</p>
          </div>
          <div className="rounded-xl border border-gold/25 bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold text-muted">마일</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-charcoal">
              {formatGrowth(profile.current_mile)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted">센터 혜택 포인트</p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold text-muted">도토리</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-charcoal">
              {formatGrowth(profile.current_acorns)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted">마을 발전 재화</p>
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
        <h3 className="text-base font-semibold text-charcoal">운동나무 단계</h3>
        <p className="mt-1 text-xs text-muted">
          단계가 오를수록 마을 탭에서 새 건물을 건설할 수 있어요
        </p>
        <ul className="mt-3 space-y-2">
          {treeStages.map((stage) => {
            const isCurrent = profile.current_stage_key === stage.stage_key
            const villageUnlock =
              VILLAGE_UNLOCK_BY_STAGE[stage.stage_key] ?? null
            return (
              <li
                key={stage.stage_key}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  isCurrent
                    ? 'bg-[#5A9E6F]/10 font-semibold text-charcoal'
                    : 'text-charcoal/80'
                }`}
              >
                <div>
                  <span>{stage.display_name_ko}</span>
                  {villageUnlock && (
                    <p className="text-[11px] text-muted">마을 · {villageUnlock}</p>
                  )}
                </div>
                <span className="tabular-nums text-muted">
                  {formatGrowth(stage.min_growth)} 성장치
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={`${cardClass} p-4`}>
        <h3 className="text-base font-semibold text-charcoal">성장 보상</h3>
        <p className="mt-1 text-xs text-muted">
          성장치는 후하게, 도토리는 소중하게 적립돼요
        </p>
        <ul className="mt-3 divide-y divide-gold/15">
          {rewardRules.map((rule) => {
            const limit = formatRewardLimit(rule)
            return (
              <li
                key={rule.event_type}
                className="flex items-start justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-charcoal">
                    {rule.display_name_ko ||
                      GROWTH_EVENT_LABELS[rule.event_type] ||
                      rule.event_type}
                  </p>
                  {limit && (
                    <p className="mt-0.5 text-xs text-muted">{limit}</p>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs leading-relaxed">
                  <p className="font-bold tabular-nums text-[#5A9E6F]">
                    +{rule.growth_reward} 성장치
                  </p>
                  {rule.acorn_reward > 0 && (
                    <p className="tabular-nums text-amber-700">
                      +{rule.acorn_reward} 도토리
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <MemberChallengesSection challenges={profile.active_challenges ?? []} />

      <section className={`${cardClass} p-4`}>
        <h3 className="text-base font-semibold text-charcoal">업적</h3>
        <p className="mt-1 text-xs text-muted">운동 습관을 쌓으며 배지를 모아보세요</p>
        <ul className="mt-3 space-y-3">
          {profile.achievements.map((item) => {
            const progress = item.is_unlocked
              ? 100
              : Math.min(
                  100,
                  Math.round((item.current_value / item.target_value) * 100),
                )
            return (
              <li
                key={item.code}
                className={`rounded-xl border px-3 py-3 ${
                  item.is_unlocked
                    ? 'border-[#5A9E6F]/40 bg-[#5A9E6F]/5'
                    : 'border-gold/20 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden>
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-charcoal">{item.title}</p>
                      {item.is_unlocked && (
                        <span className="shrink-0 text-[10px] font-bold text-[#5A9E6F]">
                          달성
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                    {!item.is_unlocked && (
                      <>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-charcoal/10">
                          <div
                            className="h-full rounded-full bg-[#5A9E6F]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted tabular-nums">
                          {item.current_value} / {item.target_value}
                        </p>
                      </>
                    )}
                    {(item.reward_growth > 0 || item.reward_acorn > 0) && (
                      <p className="mt-1.5 text-[11px] text-charcoal/70">
                        보상: +{item.reward_growth} 성장치
                        {item.reward_acorn > 0 ? ` · +${item.reward_acorn} 도토리` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={`${cardClass} p-4`}>
        <h3 className="text-base font-semibold text-charcoal">성장 타임라인</h3>
        <p className="mt-1 text-xs text-muted">최근 활동 · 업적 · 나무 성장 기록</p>
        {profile.growth_timeline.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            아직 기록이 없어요. PT 완료, 그룹수업, 운동일지를 하면 타임라인이 채워져요.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gold/15">
            {profile.growth_timeline.map((row) => (
              <li
                key={`${row.kind}-${row.id}`}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-charcoal">
                    {row.icon ? <span className="mr-1">{row.icon}</span> : null}
                    {row.title}
                  </p>
                  {row.subtitle && (
                    <p className="mt-0.5 text-xs font-medium text-charcoal/80">
                      {row.subtitle}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(row.created_at.slice(0, 10))}
                  </p>
                </div>
                {(row.growth_amount > 0 || row.acorn_amount > 0) && (
                  <div className="shrink-0 text-right text-xs leading-relaxed">
                    {row.growth_amount > 0 && (
                      <p className="font-bold tabular-nums text-[#5A9E6F]">
                        +{row.growth_amount} 성장치
                      </p>
                    )}
                    {row.acorn_amount > 0 && (
                      <p className="tabular-nums text-amber-700">
                        +{row.acorn_amount} 도토리
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-muted">
        센터를 옮겨도 운동나무는 계속 자라요
      </p>
    </div>
  )
}
