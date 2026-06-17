import { getPlatformSession } from '../lib/platformSession'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import type { PlatformCenterDetail } from '../types/platformOps'

function requirePlatformToken(): string {
  const session = getPlatformSession()
  if (!session?.token) throw new Error('플랫폼 로그인이 필요합니다.')
  return session.token
}

export async function fetchPlatformCenterDetail(
  centerId: string,
): Promise<PlatformCenterDetail> {
  const { data, error } = await supabase.rpc('get_center_detail_for_platform', {
    p_session_token: requirePlatformToken(),
    p_center_id: centerId,
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('센터 정보를 불러올 수 없습니다.')
  }
  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) {
    if (row.error === 'not_found') throw new Error('센터를 찾을 수 없습니다.')
    throw new Error('센터 정보를 불러올 수 없습니다.')
  }
  return {
    center: row.center as PlatformCenterDetail['center'],
    operations: row.operations as PlatformCenterDetail['operations'],
    finance: row.finance as PlatformCenterDetail['finance'],
    messaging: (row.messaging ?? {}) as Record<string, unknown>,
    messaging_usage: row.messaging_usage as PlatformCenterDetail['messaging_usage'],
    recent_activity: (row.recent_activity ?? []) as PlatformCenterDetail['recent_activity'],
  }
}
