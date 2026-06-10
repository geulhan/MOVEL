const TOKEN_KEY = 'mobel_admin_token'
const ADMIN_ID_KEY = 'mobel_admin_id'
const ADMIN_USERNAME_KEY = 'mobel_admin_username'

export type AdminSession = {
  token: string
  adminId: string
  username: string
}

export function saveAdminAuth(
  token: string,
  adminId: string,
  username: string,
): void {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(ADMIN_ID_KEY, adminId)
  sessionStorage.setItem(ADMIN_USERNAME_KEY, username)
}

export function getAdminSession(): AdminSession | null {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const adminId = sessionStorage.getItem(ADMIN_ID_KEY)
  const username = sessionStorage.getItem(ADMIN_USERNAME_KEY)
  if (!token || !adminId || !username) return null
  return { token, adminId, username }
}

export function isAdminAuthenticated(): boolean {
  return Boolean(sessionStorage.getItem(TOKEN_KEY))
}

export function clearAdminAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_ID_KEY)
  sessionStorage.removeItem(ADMIN_USERNAME_KEY)
}
