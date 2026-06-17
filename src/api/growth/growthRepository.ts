import { supabase } from '../../lib/supabase'
import type {
  GrowthEventType,
  GrowthProfile,
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
  recent_growth: GrowthProfile['recent_growth']
}

function normalizeProfile(raw: RpcGrowthProfile): GrowthProfile {
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
    recent_growth: Array.isArray(raw.recent_growth) ? raw.recent_growth : [],
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

export async function postGrowthEventForMemberRpc(input: {
  memberId: string
  eventType: GrowthEventType
  eventKey?: string
  source?: string
}): Promise<PostGrowthEventResult> {
  const { data, error } = await supabase.rpc('post_growth_event_for_member', {
    p_member_id: input.memberId,
    p_event_type: input.eventType,
    p_event_key: input.eventKey ?? null,
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
