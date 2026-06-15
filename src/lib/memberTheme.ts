import { DEFAULT_CENTER_THEME, parseCenterTheme, type CenterTheme } from '../types/centerBranding'

const STORAGE_PREFIX = 'mobel_member_portal_theme:'

export function loadMemberTheme(memberId: string): CenterTheme {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${memberId}`)
    if (!raw) return DEFAULT_CENTER_THEME
    return parseCenterTheme(JSON.parse(raw))
  } catch {
    return DEFAULT_CENTER_THEME
  }
}

export function saveMemberTheme(memberId: string, theme: CenterTheme): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${memberId}`, JSON.stringify(theme))
  } catch {
    /* ignore */
  }
}

export function clearMemberTheme(memberId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${memberId}`)
  } catch {
    /* ignore */
  }
}
