import { getPlatformSession } from '../lib/platformSession'
import { assertPlatformRpcOk, parsePlatformRpcRow } from '../lib/platformRpc'
import { getErrorMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'
import type { PlatformDashboardSnapshot } from '../types/platformOps'

function requirePlatformToken(): string {
  const session = getPlatformSession()
  if (!session?.token) throw new Error('플랫폼 로그인이 필요합니다.')
  return session.token
}

function parseSnapshot(data: Json): PlatformDashboardSnapshot {
  const row = parsePlatformRpcRow(data, '대시보드 데이터 형식이 올바르지 않습니다.')
  assertPlatformRpcOk(row, '대시보드를 불러올 수 없습니다')
  return {
    kpi: row.kpi as PlatformDashboardSnapshot['kpi'],
    monthly: row.monthly as PlatformDashboardSnapshot['monthly'],
    rankings: row.rankings as PlatformDashboardSnapshot['rankings'],
    beta_alerts: row.beta_alerts as PlatformDashboardSnapshot['beta_alerts'],
    recent_activity: (row.recent_activity ?? []) as PlatformDashboardSnapshot['recent_activity'],
  }
}

export async function fetchPlatformDashboard(): Promise<PlatformDashboardSnapshot> {
  const { data, error } = await supabase.rpc('get_platform_dashboard_snapshot', {
    p_session_token: requirePlatformToken(),
  })
  if (error) throw new Error(getErrorMessage(error))
  return parseSnapshot(data as Json)
}

export async function fetchBetaCentersForPlatform() {
  const { data, error } = await supabase.rpc('list_beta_centers_for_platform', {
    p_session_token: requirePlatformToken(),
  })
  if (error) throw new Error(getErrorMessage(error))
  const row = parsePlatformRpcRow(data as Json, '베타 센터 목록 형식 오류')
  assertPlatformRpcOk(row, '베타 센터 목록을 불러올 수 없습니다')
  return (row.centers ?? []) as import('../types/platformOps').BetaCenterRow[]
}
