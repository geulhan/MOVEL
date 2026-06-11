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

export function getMemberPortalUrl(): string {
  return `${getSiteOrigin()}/member`
}

export function getAdminLoginUrl(): string {
  return `${getSiteOrigin()}/login`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
