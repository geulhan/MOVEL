import { getPlatformSession } from '../lib/platformSession'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import type { PlatformAnalyticsSnapshot } from '../types/platformOps'

function requirePlatformToken(): string {
  const session = getPlatformSession()
  if (!session?.token) throw new Error('플랫폼 로그인이 필요합니다.')
  return session.token
}

export async function fetchPlatformAnalytics(): Promise<PlatformAnalyticsSnapshot> {
  const { data, error } = await supabase.rpc('get_platform_analytics', {
    p_session_token: requirePlatformToken(),
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('분석 데이터 형식이 올바르지 않습니다.')
  }
  const row = data as Record<string, Json | undefined>
  if (row.ok !== true) throw new Error('분석 데이터를 불러올 수 없습니다.')
  return {
    feature_totals: row.feature_totals as PlatformAnalyticsSnapshot['feature_totals'],
    centers: (row.centers ?? []) as PlatformAnalyticsSnapshot['centers'],
  }
}
