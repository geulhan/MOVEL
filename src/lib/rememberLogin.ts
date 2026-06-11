type RememberedCredentials = {
  loginId: string
  password: string
}

const ADMIN_KEY = 'mobel_admin_login_remember'
const MEMBER_KEY = 'mobel_member_login_remember'

function load(key: string): RememberedCredentials | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RememberedCredentials
    if (!parsed.loginId || !parsed.password) return null
    return parsed
  } catch {
    return null
  }
}

function save(key: string, loginId: string, password: string): void {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ loginId, password } satisfies RememberedCredentials),
    )
  } catch {
    /* ignore */
  }
}

function clear(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function loadRememberedAdminLogin(): RememberedCredentials | null {
  return load(ADMIN_KEY)
}

export function saveRememberedAdminLogin(
  loginId: string,
  password: string,
): void {
  save(ADMIN_KEY, loginId.trim(), password)
}

export function clearRememberedAdminLogin(): void {
  clear(ADMIN_KEY)
}

export function loadRememberedMemberLogin(): RememberedCredentials | null {
  return load(MEMBER_KEY)
}

export function saveRememberedMemberLogin(
  phone: string,
  password: string,
): void {
  save(MEMBER_KEY, phone.replace(/\D/g, ''), password)
}

export function clearRememberedMemberLogin(): void {
  clear(MEMBER_KEY)
}
