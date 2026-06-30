const DISMISS_PREFIX = 'mh_center_onboarding_dismissed:'
const PORTAL_SHARED_PREFIX = 'mh_center_onboarding_portal_shared:'
const MEMBER_GUIDE_PREFIX = 'mh_member_onboarding_seen:'

function storageKey(prefix: string, id: string): string {
  return `${prefix}${id}`
}

export function isCenterOnboardingDismissed(centerId: string): boolean {
  try {
    return localStorage.getItem(storageKey(DISMISS_PREFIX, centerId)) === '1'
  } catch {
    return false
  }
}

export function dismissCenterOnboarding(centerId: string): void {
  try {
    localStorage.setItem(storageKey(DISMISS_PREFIX, centerId), '1')
  } catch {
    /* ignore */
  }
}

export function markMemberPortalShared(centerId: string): void {
  try {
    localStorage.setItem(storageKey(PORTAL_SHARED_PREFIX, centerId), '1')
  } catch {
    /* ignore */
  }
}

export function isMemberPortalShared(centerId: string): boolean {
  try {
    return localStorage.getItem(storageKey(PORTAL_SHARED_PREFIX, centerId)) === '1'
  } catch {
    return false
  }
}

export function isMemberOnboardingSeen(memberId: string): boolean {
  try {
    return localStorage.getItem(storageKey(MEMBER_GUIDE_PREFIX, memberId)) === '1'
  } catch {
    return false
  }
}

const SETTINGS_VISITED_PREFIX = 'mh_center_settings_visited:'

export function markCenterSettingsVisited(centerId: string): void {
  try {
    localStorage.setItem(storageKey(SETTINGS_VISITED_PREFIX, centerId), '1')
  } catch {
    /* ignore */
  }
}

export function isCenterSettingsVisited(centerId: string): boolean {
  try {
    return localStorage.getItem(storageKey(SETTINGS_VISITED_PREFIX, centerId)) === '1'
  } catch {
    return false
  }
}

export function markMemberOnboardingSeen(memberId: string): void {
  try {
    localStorage.setItem(storageKey(MEMBER_GUIDE_PREFIX, memberId), '1')
  } catch {
    /* ignore */
  }
}
