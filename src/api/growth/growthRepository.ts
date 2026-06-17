import { supabase } from '../../lib/supabase'
import type {
  GrowthAchievement,
  GrowthEventType,
  GrowthFeedItem,
  GrowthNotification,
  GrowthProfile,
  GrowthRewardRule,
  GrowthTimelineItem,
  GrowthTreeStageRow,
  PostGrowthEventResult,
} from '../../types/growth'

type RpcGrowthProfile = {
  ok: boolean
  user_id: string
  member_id: string
  total_growth: number
  current_acorns: number
  current_mile: number
  current_stage_key: GrowthProfile['current_stage_key']
  current_stage_name: string
  next_stage_key: GrowthProfile['next_stage_key']
  next_stage_name: string | null
  growth_until_next: number
  is_max_stage: boolean
  tree: GrowthProfile['tree']
  growth_feed?: GrowthFeedItem[]
  recent_growth?: GrowthProfile['recent_growth']
  growth_timeline?: GrowthTimelineItem[]
  growth_notifications?: GrowthNotification[]
  unread_notification_count?: number
  achievements?: GrowthAchievement[]
  reward_rules?: GrowthRewardRule[]
  tree_stages?: GrowthTreeStageRow[]
}

function normalizeRewardRules(raw: unknown): GrowthRewardRule[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const item = row as Record<string, unknown>
    const period = String(item.limit_period ?? 'none')
    return {
      event_type: String(item.event_type ?? ''),
      display_name_ko: String(item.display_name_ko ?? ''),
      growth_reward: Number(item.growth_reward) || 0,
      acorn_reward: Number(item.acorn_reward) || 0,
      limit_period:
        period === 'monthly' || period === 'rolling_30d' ? period : 'none',
      limit_count:
        item.limit_count == null ? null : Number(item.limit_count) || null,
    }
  })
}

function normalizeTreeStages(raw: unknown): GrowthTreeStageRow[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const item = row as Record<string, unknown>
    return {
      stage_key: String(item.stage_key ?? ''),
      sort_order: Number(item.sort_order) || 0,
      min_growth: Number(item.min_growth) || 0,
      display_name_ko: String(item.display_name_ko ?? ''),
    }
  })
}

function normalizeFeedItem(row: Record<string, unknown>): GrowthFeedItem {
  return {
    id: String(row.id ?? ''),
    event_type: String(row.event_type ?? ''),
    event_key: row.event_key != null ? String(row.event_key) : undefined,
    title_ko: String(row.title_ko ?? ''),
    growth_amount: Number(row.growth_amount) || 0,
    acorn_amount: Number(row.acorn_amount) || 0,
    source: row.source != null ? String(row.source) : null,
    created_at: String(row.created_at ?? ''),
  }
}

function normalizeFeed(raw: unknown): GrowthFeedItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => normalizeFeedItem(row as Record<string, unknown>))
}

function normalizeTimeline(raw: unknown): GrowthTimelineItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const item = row as Record<string, unknown>
    return {
      id: String(item.id ?? ''),
      kind: String(item.kind ?? 'activity'),
      title: String(item.title ?? ''),
      subtitle: item.subtitle != null ? String(item.subtitle) : null,
      icon: item.icon != null ? String(item.icon) : null,
      growth_amount: Number(item.growth_amount) || 0,
      acorn_amount: Number(item.acorn_amount) || 0,
      created_at: String(item.created_at ?? ''),
    }
  })
}

function normalizeNotifications(raw: unknown): GrowthNotification[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const item = row as Record<string, unknown>
    return {
      id: String(item.id ?? ''),
      notification_type: String(item.notification_type ?? ''),
      title: String(item.title ?? ''),
      body: item.body != null ? String(item.body) : null,
      icon: String(item.icon ?? '🎉'),
      growth_amount: Number(item.growth_amount) || 0,
      acorn_amount: Number(item.acorn_amount) || 0,
      is_read: Boolean(item.is_read),
      created_at: String(item.created_at ?? ''),
    }
  })
}

function normalizeAchievements(raw: unknown): GrowthAchievement[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const item = row as Record<string, unknown>
    return {
      id: String(item.id ?? ''),
      code: String(item.code ?? ''),
      title: String(item.title ?? ''),
      description: String(item.description ?? ''),
      icon: String(item.icon ?? '🏅'),
      metric_type: String(item.metric_type ?? ''),
      target_value: Number(item.target_value) || 0,
      reward_growth: Number(item.reward_growth) || 0,
      reward_acorn: Number(item.reward_acorn) || 0,
      sort_order: Number(item.sort_order) || 0,
      current_value: Number(item.current_value) || 0,
      is_unlocked: Boolean(item.is_unlocked),
      unlocked_at: item.unlocked_at != null ? String(item.unlocked_at) : null,
    }
  })
}

function normalizeProfile(raw: RpcGrowthProfile): GrowthProfile {
  const feed = normalizeFeed(raw.growth_feed ?? raw.recent_growth)
  return {
    user_id: raw.user_id,
    member_id: raw.member_id,
    total_growth: Number(raw.total_growth) || 0,
    current_acorns: Number(raw.current_acorns) || 0,
    current_mile: Number(raw.current_mile) || 0,
    current_stage_key: raw.current_stage_key ?? 'none',
    current_stage_name: raw.current_stage_name ?? '시작 전',
    next_stage_key: raw.next_stage_key ?? null,
    next_stage_name: raw.next_stage_name ?? null,
    growth_until_next: Number(raw.growth_until_next) || 0,
    is_max_stage: Boolean(raw.is_max_stage),
    tree: raw.tree,
    growth_feed: feed,
    recent_growth: feed.map((item) => ({
      id: item.id,
      event_type: item.event_type,
      title_ko: item.title_ko,
      growth_amount: item.growth_amount,
      acorn_amount: item.acorn_amount,
      source: item.source,
      created_at: item.created_at,
    })),
    growth_timeline: normalizeTimeline(raw.growth_timeline),
    growth_notifications: normalizeNotifications(raw.growth_notifications),
    unread_notification_count: Number(raw.unread_notification_count) || 0,
    achievements: normalizeAchievements(raw.achievements),
    reward_rules: normalizeRewardRules(raw.reward_rules),
    tree_stages: normalizeTreeStages(raw.tree_stages),
  }
}

export async function fetchGrowthProfileRpc(
  memberId: string,
): Promise<GrowthProfile> {
  const { data, error } = await supabase.rpc('get_growth_profile', {
    p_member_id: memberId,
  })

  if (error) throw error
  if (!data || typeof data !== 'object') {
    throw new Error('성장 정보를 불러올 수 없습니다.')
  }

  const raw = data as RpcGrowthProfile
  if (!raw.ok) {
    throw new Error('성장 정보를 불러올 수 없습니다.')
  }

  return normalizeProfile(raw)
}

export async function markGrowthNotificationsReadRpc(
  memberId: string,
): Promise<void> {
  const { error } = await supabase.rpc('mark_growth_notifications_read', {
    p_member_id: memberId,
  })
  if (error) throw error
}

export async function postGrowthEventForMemberRpc(input: {
  memberId: string
  eventType: GrowthEventType
  eventKey: string
  source?: string
}): Promise<PostGrowthEventResult> {
  const { data, error } = await supabase.rpc('post_growth_event_for_member', {
    p_member_id: input.memberId,
    p_event_type: input.eventType,
    p_event_key: input.eventKey,
    p_source: input.source ?? null,
  })

  if (error) throw error
  if (!data || typeof data !== 'object') {
    throw new Error('성장 이벤트 처리에 실패했습니다.')
  }

  const raw = data as PostGrowthEventResult
  return {
    ...raw,
    total_growth: Number(raw.total_growth) || 0,
    current_acorns: Number(raw.current_acorns) || 0,
  }
}
