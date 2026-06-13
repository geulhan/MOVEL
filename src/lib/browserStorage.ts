function canUseStorage(storage: Storage): boolean {
  try {
    const probe = '__mobel_storage_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/** 카카오톡 인앱 브라우저 등에서 sessionStorage가 불안정할 때 localStorage도 함께 사용 */
export function setPersistedItem(key: string, value: string): void {
  if (canUseStorage(localStorage)) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* ignore quota / private mode */
    }
  }
  if (canUseStorage(sessionStorage)) {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      /* ignore */
    }
  }
}

export function getPersistedItem(key: string): string | null {
  if (canUseStorage(sessionStorage)) {
    const fromSession = sessionStorage.getItem(key)
    if (fromSession) return fromSession
  }
  if (canUseStorage(localStorage)) {
    return localStorage.getItem(key)
  }
  return null
}

export function removePersistedItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
