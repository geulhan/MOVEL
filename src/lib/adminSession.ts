const TOKEN_KEY = 'mobel_admin_token'
const ADMIN_ID_KEY = 'mobel_admin_id'
const ADMIN_USERNAME_KEY = 'mobel_admin_username'
const ADMIN_ROLE_KEY = 'mobel_admin_role'
const ADMIN_TRAINER_ID_KEY = 'mobel_admin_trainer_id'
const ADMIN_TRAINER_NAME_KEY = 'mobel_admin_trainer_name'

export type AdminRole = 'admin' | 'trainer'

export type AdminSession = {
  token: string
  adminId: string
  username: string
  role: AdminRole
  trainerId: string | null
  trainerName: string | null
}

export function saveAdminAuth(
  token: string,
  adminId: string,
  username: string,
  role: AdminRole = 'admin',
  trainerId: string | null = null,
  trainerName: string | null = null,
): void {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(ADMIN_ID_KEY, adminId)
  sessionStorage.setItem(ADMIN_USERNAME_KEY, username)
  sessionStorage.setItem(ADMIN_ROLE_KEY, role)
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
  if (!token || !adminId || !username) return null

  const roleRaw = sessionStorage.getItem(ADMIN_ROLE_KEY)
  const role: AdminRole = roleRaw === 'trainer' ? 'trainer' : 'admin'

  return {
    token,
    adminId,
    username,
    role,
    trainerId: sessionStorage.getItem(ADMIN_TRAINER_ID_KEY),
    trainerName: sessionStorage.getItem(ADMIN_TRAINER_NAME_KEY),
  }
}

export function isAdminAuthenticated(): boolean {
  return Boolean(sessionStorage.getItem(TOKEN_KEY))
}

export function clearAdminAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_ID_KEY)
  sessionStorage.removeItem(ADMIN_USERNAME_KEY)
  sessionStorage.removeItem(ADMIN_ROLE_KEY)
  sessionStorage.removeItem(ADMIN_TRAINER_ID_KEY)
  sessionStorage.removeItem(ADMIN_TRAINER_NAME_KEY)
}
