import { supabase } from './supabase'

/** 기본 센터 slug (MOVEL 단일 운영) */
export const DEFAULT_CENTER_SLUG = 'movel'

let cachedDefaultCenterId: string | null = null

/**
 * DB에서 기본 센터(MOVEL) ID를 조회합니다.
 * migration_032_centers.sql 적용 후 사용 가능합니다.
 */
export async function getDefaultCenterId(): Promise<string> {
  if (cachedDefaultCenterId) return cachedDefaultCenterId

  const { data, error } = await supabase
    .from('centers')
    .select('id')
    .eq('slug', DEFAULT_CENTER_SLUG)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  if (!data?.id) {
    throw new Error(
      '기본 센터를 찾을 수 없습니다. Supabase에서 migration_032_centers.sql을 실행해 주세요.',
    )
  }

  cachedDefaultCenterId = data.id
  return cachedDefaultCenterId
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
