/** MOVEL 단일 센터 레거시 slug */
export const LEGACY_MOVEL_SLUG = 'movel'

const ADMIN_CENTER_SLUG_KEY = 'mobel_admin_center_slug'
const MEMBER_CENTER_SLUG_KEY = 'mobel_member_center_slug'

/** movel 전용 배포(movel.vercel.app 등)에서만 기본 센터 자동 입력 */
export function isMovelDedicatedHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  if (host.includes('motionhub')) return false
  return host.includes('movel')
}

export function resolveAdminCenterSlugFromUrl(
  urlCenter: string | null | undefined,
): string {
  const fromUrl = urlCenter?.trim().toLowerCase()
  if (fromUrl) return fromUrl

  const remembered = loadRememberedAdminCenterSlug()
  if (remembered) return remembered

  if (isMovelDedicatedHost()) return LEGACY_MOVEL_SLUG

  return ''
}

export function resolveMemberCenterSlugFromUrl(
  urlCenter: string | null | undefined,
): string {
  const fromUrl = urlCenter?.trim().toLowerCase()
  if (fromUrl) return fromUrl

  const remembered = loadRememberedMemberCenterSlug()
  if (remembered) return remembered

  if (isMovelDedicatedHost()) return LEGACY_MOVEL_SLUG

  return ''
}

export function saveRememberedAdminCenterSlug(slug: string): void {
  try {
    localStorage.setItem(ADMIN_CENTER_SLUG_KEY, slug.trim().toLowerCase())
  } catch {
    /* ignore */
  }
}

export function loadRememberedAdminCenterSlug(): string | null {
  try {
    const value = localStorage.getItem(ADMIN_CENTER_SLUG_KEY)?.trim().toLowerCase()
    return value || null
  } catch {
    return null
  }
}

export function clearRememberedAdminCenterSlug(): void {
  try {
    localStorage.removeItem(ADMIN_CENTER_SLUG_KEY)
  } catch {
    /* ignore */
  }
}

export function saveRememberedMemberCenterSlug(slug: string): void {
  try {
    localStorage.setItem(MEMBER_CENTER_SLUG_KEY, slug.trim().toLowerCase())
  } catch {
    /* ignore */
  }
}

export function loadRememberedMemberCenterSlug(): string | null {
  try {
    const value = localStorage.getItem(MEMBER_CENTER_SLUG_KEY)?.trim().toLowerCase()
    return value || null
  } catch {
    return null
  }
}

export function clearRememberedMemberCenterSlug(): void {
  try {
    localStorage.removeItem(MEMBER_CENTER_SLUG_KEY)
  } catch {
    /* ignore */
  }
}

export function buildAdminLoginPath(centerSlug?: string | null): string {
  const slug = centerSlug?.trim().toLowerCase() || loadRememberedAdminCenterSlug() || ''
  return slug ? `/login?center=${encodeURIComponent(slug)}` : '/login'
}
