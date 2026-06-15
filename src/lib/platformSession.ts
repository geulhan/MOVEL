const TOKEN_KEY = 'motionhub_platform_token'
const ADMIN_ID_KEY = 'motionhub_platform_admin_id'
const USERNAME_KEY = 'motionhub_platform_username'
const DISPLAY_NAME_KEY = 'motionhub_platform_display_name'

export type PlatformSession = {
  token: string
  adminId: string
  username: string
  displayName: string | null
}

export function savePlatformAuth(
  token: string,
  adminId: string,
  username: string,
  displayName: string | null = null,
): void {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(ADMIN_ID_KEY, adminId)
  sessionStorage.setItem(USERNAME_KEY, username)
  if (displayName) {
    sessionStorage.setItem(DISPLAY_NAME_KEY, displayName)
  } else {
    sessionStorage.removeItem(DISPLAY_NAME_KEY)
  }
}

export function getPlatformSession(): PlatformSession | null {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const adminId = sessionStorage.getItem(ADMIN_ID_KEY)
  const username = sessionStorage.getItem(USERNAME_KEY)
  if (!token || !adminId || !username) return null

  return {
    token,
    adminId,
    username,
    displayName: sessionStorage.getItem(DISPLAY_NAME_KEY),
  }
}

export function isPlatformAuthenticated(): boolean {
  return Boolean(sessionStorage.getItem(TOKEN_KEY))
}

export function clearPlatformAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_ID_KEY)
  sessionStorage.removeItem(USERNAME_KEY)
  sessionStorage.removeItem(DISPLAY_NAME_KEY)
}
