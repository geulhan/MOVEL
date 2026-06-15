const TOKEN_KEY = 'mobel_admin_token'
const ADMIN_ID_KEY = 'mobel_admin_id'
const ADMIN_USERNAME_KEY = 'mobel_admin_username'
const ADMIN_ROLE_KEY = 'mobel_admin_role'
const ADMIN_TRAINER_ID_KEY = 'mobel_admin_trainer_id'
const ADMIN_TRAINER_NAME_KEY = 'mobel_admin_trainer_name'
const ADMIN_CENTER_ID_KEY = 'mobel_admin_center_id'
const ADMIN_CENTER_SLUG_KEY = 'mobel_admin_center_slug'
const ADMIN_CENTER_NAME_KEY = 'mobel_admin_center_name'

export type AdminRole = 'admin' | 'trainer'

export type AdminSession = {
  token: string
  adminId: string
  username: string
  role: AdminRole
  trainerId: string | null
  trainerName: string | null
  centerId: string
  centerSlug: string
  centerName: string
}

export function saveAdminAuth(
  token: string,
  adminId: string,
  username: string,
  role: AdminRole = 'admin',
  trainerId: string | null = null,
  trainerName: string | null = null,
  centerId: string = '',
  centerSlug: string = 'movel',
  centerName: string = '',
): void {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(ADMIN_ID_KEY, adminId)
  sessionStorage.setItem(ADMIN_USERNAME_KEY, username)
  sessionStorage.setItem(ADMIN_ROLE_KEY, role)
  sessionStorage.setItem(ADMIN_CENTER_ID_KEY, centerId)
  sessionStorage.setItem(ADMIN_CENTER_SLUG_KEY, centerSlug)
  sessionStorage.setItem(ADMIN_CENTER_NAME_KEY, centerName)
  if (trainerId) {
    sessionStorage.setItem(ADMIN_TRAINER_ID_KEY, trainerId)
  } else {
    sessionStorage.removeItem(ADMIN_TRAINER_ID_KEY)
  }
  if (trainerName) {
    sessionStorage.setItem(ADMIN_TRAINER_NAME_KEY, trainerName)
  } else {
    sessionStorage.removeItem(ADMIN_TRAINER_NAME_KEY)
  }
}

export function getAdminSession(): AdminSession | null {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const adminId = sessionStorage.getItem(ADMIN_ID_KEY)
  const username = sessionStorage.getItem(ADMIN_USERNAME_KEY)
  const centerId = sessionStorage.getItem(ADMIN_CENTER_ID_KEY)
  const centerSlug = sessionStorage.getItem(ADMIN_CENTER_SLUG_KEY)
  if (!token || !adminId || !username || !centerId || !centerSlug) return null

  const roleRaw = sessionStorage.getItem(ADMIN_ROLE_KEY)
  const role: AdminRole = roleRaw === 'trainer' ? 'trainer' : 'admin'

  return {
    token,
    adminId,
    username,
    role,
    trainerId: sessionStorage.getItem(ADMIN_TRAINER_ID_KEY),
    trainerName: sessionStorage.getItem(ADMIN_TRAINER_NAME_KEY),
    centerId,
    centerSlug,
    centerName: sessionStorage.getItem(ADMIN_CENTER_NAME_KEY) ?? centerSlug,
  }
}

export function isAdminAuthenticated(): boolean {
  return Boolean(getAdminSession())
}

export function clearAdminAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_ID_KEY)
  sessionStorage.removeItem(ADMIN_USERNAME_KEY)
  sessionStorage.removeItem(ADMIN_ROLE_KEY)
  sessionStorage.removeItem(ADMIN_TRAINER_ID_KEY)
  sessionStorage.removeItem(ADMIN_TRAINER_NAME_KEY)
  sessionStorage.removeItem(ADMIN_CENTER_ID_KEY)
  sessionStorage.removeItem(ADMIN_CENTER_SLUG_KEY)
  sessionStorage.removeItem(ADMIN_CENTER_NAME_KEY)
}
