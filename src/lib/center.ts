import { getAdminSession } from './adminSession'
import { getMemberCenterSlug } from '../api/memberPortal'
import { supabase } from './supabase'

/** 기본 센터 slug (MOVEL 단일 운영 호환) */
export const DEFAULT_CENTER_SLUG = 'movel'

let cachedCenterId: string | null = null
let cachedCenterSlug: string | null = null

async function fetchCenterIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('centers')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
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

function resolveSlugFromContext(): string {
  const admin = getAdminSession()
  if (admin?.centerSlug) return admin.centerSlug

  const memberSlug = getMemberCenterSlug()
  if (memberSlug) return memberSlug

  return DEFAULT_CENTER_SLUG
}

/**
 * insert/update에 사용할 center_id.
 * 관리자 세션 → 회원 세션 slug → 기본 센터 순으로 해석합니다.
 */
export async function resolveCenterIdForMember(
  memberId?: string,
): Promise<string> {
  const admin = getAdminSession()
  if (admin?.centerId) return admin.centerId

  if (cachedCenterId && cachedCenterSlug === resolveSlugFromContext()) {
    return cachedCenterId
  }

  const slug = resolveSlugFromContext()

  try {
    const fromSlug = await fetchCenterIdBySlug(slug)
    if (fromSlug) {
      cachedCenterId = fromSlug
      cachedCenterSlug = slug
      return cachedCenterId
    }
  } catch (centersErr) {
    if (!memberId) throw centersErr
  }

  if (memberId) {
    const fromMember = await fetchMemberCenterId(memberId)
    if (fromMember) {
      cachedCenterId = fromMember
      return cachedCenterId
    }
  }

  throw new Error(
    '센터를 찾을 수 없습니다. Supabase에서 migration_040~046을 실행해 주세요.',
  )
}

export async function getDefaultCenterId(): Promise<string> {
  return resolveCenterIdForMember()
}

/**
 * 현재 요청 컨텍스트의 센터 ID.
 */
export async function getCurrentCenterId(): Promise<string> {
  return resolveCenterIdForMember()
}

export function getCurrentCenterSlug(): string {
  return resolveSlugFromContext()
}

/** 테스트·센터 전환 시 캐시 초기화 */
export function resetCenterIdCache(): void {
  cachedCenterId = null
  cachedCenterSlug = null
}
