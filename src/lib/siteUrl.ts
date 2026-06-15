/** 배포 도메인 (Vercel 환경 변수로 덮어쓸 수 있음) */
const DEFAULT_SITE_ORIGIN = 'https://movel.vercel.app'

export function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }
  const fromEnv = import.meta.env.VITE_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return DEFAULT_SITE_ORIGIN
}

import { isMovelDedicatedHost, LEGACY_MOVEL_SLUG } from './centerSlug'

export function getMemberPortalUrl(centerSlug?: string): string {
  const slug =
    centerSlug?.trim().toLowerCase() ||
    (isMovelDedicatedHost() ? LEGACY_MOVEL_SLUG : '')
  return slug
    ? `${getSiteOrigin()}/member?center=${encodeURIComponent(slug)}`
    : `${getSiteOrigin()}/member`
}

export function getAdminLoginUrl(centerSlug?: string): string {
  const slug =
    centerSlug?.trim().toLowerCase() ||
    (isMovelDedicatedHost() ? LEGACY_MOVEL_SLUG : '')
  return slug
    ? `${getSiteOrigin()}/login?center=${encodeURIComponent(slug)}`
    : `${getSiteOrigin()}/login`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
