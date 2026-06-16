import { getAdminSession } from './adminSession'
import { getMemberCenterId, getMemberCenterSlug } from '../api/memberPortal'
import { supabase } from './supabase'
import { LEGACY_MOVEL_SLUG, isMovelDedicatedHost } from './centerSlug'

/** @deprecated LEGACY_MOVEL_SLUG 사용 */
export const DEFAULT_CENTER_SLUG = LEGACY_MOVEL_SLUG

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

function resolveSlugFromContext(): string | null {
  const admin = getAdminSession()
  if (admin?.centerSlug) return admin.centerSlug

  const memberSlug = getMemberCenterSlug()
  if (memberSlug) return memberSlug

  if (isMovelDedicatedHost()) return LEGACY_MOVEL_SLUG

  return null
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

  const persistedMemberCenterId = getMemberCenterId()
  if (persistedMemberCenterId) {
    cachedCenterId = persistedMemberCenterId
    return persistedMemberCenterId
  }

  const slug = resolveSlugFromContext()

  if (cachedCenterId && slug && cachedCenterSlug === slug) {
    return cachedCenterId
  }

  if (slug) {
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
  }

  if (memberId) {
    const fromMember = await fetchMemberCenterId(memberId)
    if (fromMember) {
      cachedCenterId = fromMember
      return cachedCenterId
    }
  }

  throw new Error(
    '센터 코드가 지정되지 않았습니다. 로그인 후 다시 시도해 주세요.',
  )
}

export async function getDefaultCenterId(): Promise<string> {
  return resolveCenterIdForMember()
}

/**
 * 현재 요청 컨텍스트의 센터 ID.
 * 회원 포털 API는 memberId를 넘기면 DB에서 센터를 조회합니다.
 */
export async function getCurrentCenterId(memberId?: string): Promise<string> {
  return resolveCenterIdForMember(memberId)
}

export function getCurrentCenterSlug(): string | null {
  return resolveSlugFromContext()
}

/** 테스트·센터 전환 시 캐시 초기화 */
export function resetCenterIdCache(): void {
  cachedCenterId = null
  cachedCenterSlug = null
}

export async function fetchCenterNameById(centerId: string): Promise<string> {
  const { data, error } = await supabase
    .from('centers')
    .select('name')
    .eq('id', centerId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data?.name ? String(data.name) : '센터'
}

/** 계약서 등 회원 소속 센터 표시명 */
export async function resolveCenterNameForMember(
  member: { id?: string; center_id?: string | null },
): Promise<string> {
  if (member.center_id) {
    return fetchCenterNameById(member.center_id)
  }

  const admin = getAdminSession()
  if (admin?.centerId) {
    return fetchCenterNameById(admin.centerId)
  }

  if (member.id) {
    try {
      const centerId = await resolveCenterIdForMember(member.id)
      return fetchCenterNameById(centerId)
    } catch {
      // fall through
    }
  }

  const slug = resolveSlugFromContext()
  if (slug) {
    const { data, error } = await supabase
      .from('centers')
      .select('name')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    if (data?.name) return String(data.name)
  }

  return '센터'
}
