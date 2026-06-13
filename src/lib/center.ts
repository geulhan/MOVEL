import { supabase } from './supabase'

/** 기본 센터 slug (MOVEL 단일 운영) */
export const DEFAULT_CENTER_SLUG = 'movel'

let cachedDefaultCenterId: string | null = null

async function fetchDefaultCenterIdFromDb(): Promise<string | null> {
  const { data, error } = await supabase
    .from('centers')
    .select('id')
    .eq('slug', DEFAULT_CENTER_SLUG)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}

async function fetchMemberCenterId(memberId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('members')
    .select('center_id')
    .eq('id', memberId)
    .maybeSingle()

  if (error) throw error
  return data?.center_id ? String(data.center_id) : null
}

/**
 * insert/update에 사용할 center_id.
 * centers 조회 실패 시 회원 row의 center_id로 fallback (인앱 브라우저·캐시 이슈 대비).
 */
export async function resolveCenterIdForMember(
  memberId?: string,
): Promise<string> {
  if (cachedDefaultCenterId) return cachedDefaultCenterId

  try {
    const fromCenters = await fetchDefaultCenterIdFromDb()
    if (fromCenters) {
      cachedDefaultCenterId = fromCenters
      return cachedDefaultCenterId
    }
  } catch (centersErr) {
    if (!memberId) throw centersErr
  }

  if (memberId) {
    const fromMember = await fetchMemberCenterId(memberId)
    if (fromMember) {
      cachedDefaultCenterId = fromMember
      return cachedDefaultCenterId
    }
  }

  throw new Error(
    '기본 센터를 찾을 수 없습니다. Supabase에서 migration_032_centers.sql을 실행해 주세요.',
  )
}

/**
 * DB에서 기본 센터(MOVEL) ID를 조회합니다.
 * migration_032_centers.sql 적용 후 사용 가능합니다.
 */
export async function getDefaultCenterId(): Promise<string> {
  return resolveCenterIdForMember()
}

/**
 * 현재 요청 컨텍스트의 센터 ID.
 * 1단계에서는 항상 기본 센터(MOVEL)를 반환합니다.
 */
export async function getCurrentCenterId(): Promise<string> {
  return getDefaultCenterId()
}

/** 테스트·센터 전환 시 캐시 초기화 */
export function resetCenterIdCache(): void {
  cachedDefaultCenterId = null
}
