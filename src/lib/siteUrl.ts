import { isMovelDedicatedHost, LEGACY_MOVEL_SLUG } from './centerSlug'

/** 배포·공유용 기본 도메인 */
const DEFAULT_SITE_ORIGIN = 'https://motionhub.kr'

/** 카톡·QR 공유 링크에 쓸 대표 도메인 (현재 접속 주소와 무관) */
export function getShareableSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')
  return DEFAULT_SITE_ORIGIN
}

/** 현재 브라우저 접속 origin */
export function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }
  return getShareableSiteOrigin()
}

export function getMemberPortalUrl(centerSlug?: string): string {
  const slug =
    centerSlug?.trim().toLowerCase() ||
    (isMovelDedicatedHost() ? LEGACY_MOVEL_SLUG : '')
  const origin = getShareableSiteOrigin()
  return slug
    ? `${origin}/member?center=${encodeURIComponent(slug)}`
    : `${origin}/member`
}

export function getAdminLoginUrl(): string {
  return `${getShareableSiteOrigin()}/login`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
