import { supabase } from '../../lib/supabase'
import type { SeasonPassState } from '../../types/season'

function normalizeSeasonPassState(raw: Record<string, unknown>): SeasonPassState {
  const rewards = Array.isArray(raw.rewards)
    ? raw.rewards.map((row) => {
        const item = row as Record<string, unknown>
        return {
          id: String(item.id ?? ''),
          level: Number(item.level) || 0,
          xp_required: Number(item.xp_required) || 0,
          reward_type: String(item.reward_type ?? 'acorns'),
          reward_acorns: Number(item.reward_acorns) || 0,
          garden_shop_item_id:
            item.garden_shop_item_id != null ? String(item.garden_shop_item_id) : null,
          title: String(item.title ?? ''),
          description: String(item.description ?? ''),
          icon: String(item.icon ?? '🎁'),
          sprite_key: item.sprite_key != null ? String(item.sprite_key) : null,
          is_unlocked: Boolean(item.is_unlocked),
          is_claimed: Boolean(item.is_claimed),
        }
      })
    : []

  const xpRules = Array.isArray(raw.xp_rules)
    ? raw.xp_rules.map((row) => {
        const item = row as Record<string, unknown>
        return {
          event_type: String(item.event_type ?? ''),
          display_name_ko: String(item.display_name_ko ?? ''),
          xp_amount: Number(item.xp_amount) || 0,
        }
      })
    : []

  const seasonRaw = raw.season as Record<string, unknown> | undefined
  const progressRaw = raw.progress as Record<string, unknown> | undefined
  const nextRaw = progressRaw?.next_reward as Record<string, unknown> | null | undefined

  return {
    has_active_season: Boolean(raw.has_active_season),
    member_id: String(raw.member_id ?? ''),
    user_id: raw.user_id != null ? String(raw.user_id) : undefined,
    season: seasonRaw
      ? {
          id: String(seasonRaw.id ?? ''),
          title: String(seasonRaw.title ?? ''),
          description: String(seasonRaw.description ?? ''),
          start_date: String(seasonRaw.start_date ?? '').slice(0, 10),
          end_date: String(seasonRaw.end_date ?? '').slice(0, 10),
          max_level: Number(seasonRaw.max_level) || 20,
        }
      : undefined,
    progress: progressRaw
      ? {
          season_xp: Number(progressRaw.season_xp) || 0,
          current_level: Number(progressRaw.current_level) || 0,
          next_reward: nextRaw
            ? {
                id: String(nextRaw.id ?? ''),
                level: Number(nextRaw.level) || 0,
                xp_required: Number(nextRaw.xp_required) || 0,
                title: String(nextRaw.title ?? ''),
                description: String(nextRaw.description ?? ''),
                icon: String(nextRaw.icon ?? '🎁'),
              }
            : null,
        }
      : undefined,
    rewards,
    xp_rules: xpRules,
  }
}

export async function fetchSeasonPassStateRpc(memberId: string): Promise<SeasonPassState> {
  const { data, error } = await supabase.rpc('get_season_pass_state', {
    p_member_id: memberId,
  })
  if (error) throw error
  return normalizeSeasonPassState((data ?? {}) as Record<string, unknown>)
}

export async function claimSeasonRewardRpc(
  memberId: string,
  seasonRewardId: string,
): Promise<SeasonPassState> {
  const { data, error } = await supabase.rpc('claim_season_reward', {
    p_member_id: memberId,
    p_season_reward_id: seasonRewardId,
  })
  if (error) throw error
  return normalizeSeasonPassState((data ?? {}) as Record<string, unknown>)
}
