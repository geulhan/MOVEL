const PROJECT_STORAGE_KEY = 'blogbrain:active-project-id'

export function getStoredProjectId(): string | null {
  return localStorage.getItem(PROJECT_STORAGE_KEY)
}

export function setStoredProjectId(projectId: string) {
  localStorage.setItem(PROJECT_STORAGE_KEY, projectId)
}

export function clearStoredProjectId() {
  localStorage.removeItem(PROJECT_STORAGE_KEY)
}
