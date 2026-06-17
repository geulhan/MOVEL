import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'

export type PlatformActivityAction =
  | 'login'
  | 'member_created'
  | 'member_updated'
  | 'schedule_created'
  | 'schedule_completed'
  | 'schedule_cancelled'
  | 'attendance_checkin'
  | 'attendance_processed'
  | 'message_sent'
  | 'payment_registered'
  | 'journal_created'
  | 'analytics_viewed'

/** 플랫폼 운영 분석용 활동 로그 (실패해도 본 기능에는 영향 없음) */
export async function logPlatformActivity(
  action: PlatformActivityAction,
  options?: {
    centerId?: string
    actorType?: 'admin' | 'trainer' | 'member' | 'system'
    actorId?: string
    metadata?: Record<string, string | number | boolean | null>
  },
): Promise<void> {
  try {
    const centerId = options?.centerId ?? (await getCurrentCenterId())
    await supabase.rpc('log_platform_activity', {
      p_center_id: centerId,
      p_action: action,
      p_actor_type: options?.actorType ?? 'system',
      p_actor_id: options?.actorId ?? null,
      p_metadata: options?.metadata ?? {},
    })
  } catch {
    // 분석용 — 무시
  }
}
