import { getPlatformSession } from '../lib/platformSession'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import type {
  PlatformFeedbackItem,
  PlatformFeedbackStatus,
  PlatformFeedbackType,
} from '../types/platformOps'

function requirePlatformToken(): string {
  const session = getPlatformSession()
  if (!session?.token) throw new Error('플랫폼 로그인이 필요합니다.')
  return session.token
}

export async function submitPlatformFeedback(input: {
  centerId: string
  createdBy: string
  createdByType: 'admin' | 'trainer' | 'member'
  type: PlatformFeedbackType
  title: string
  content: string
}): Promise<void> {
  const { data, error } = await supabase.rpc('submit_platform_feedback', {
    p_center_id: input.centerId,
    p_created_by: input.createdBy,
    p_created_by_type: input.createdByType,
    p_type: input.type,
    p_title: input.title.trim(),
    p_content: input.content.trim(),
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('피드백 전송에 실패했습니다.')
  }
  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) throw new Error('피드백 전송에 실패했습니다.')
}

export async function fetchPlatformFeedback(filters?: {
  type?: PlatformFeedbackType
  status?: PlatformFeedbackStatus
}): Promise<PlatformFeedbackItem[]> {
  const { data, error } = await supabase.rpc('list_platform_feedback_for_platform', {
    p_session_token: requirePlatformToken(),
    p_type: filters?.type ?? null,
    p_status: filters?.status ?? null,
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) throw new Error('피드백 목록을 불러올 수 없습니다.')
  return (row.items ?? []) as PlatformFeedbackItem[]
}

export async function updatePlatformFeedbackStatus(
  feedbackId: string,
  status: PlatformFeedbackStatus,
): Promise<void> {
  const { data, error } = await supabase.rpc('update_platform_feedback_status', {
    p_session_token: requirePlatformToken(),
    p_feedback_id: feedbackId,
    p_status: status,
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('상태 변경에 실패했습니다.')
  }
  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) throw new Error('상태 변경에 실패했습니다.')
}
