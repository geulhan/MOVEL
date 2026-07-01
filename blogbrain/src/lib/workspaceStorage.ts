const WORKSPACE_STORAGE_KEY = 'blogbrain:active-workspace-id'

export function getStoredWorkspaceId(): string | null {
  return localStorage.getItem(WORKSPACE_STORAGE_KEY)
}

export function setStoredWorkspaceId(workspaceId: string) {
  localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId)
}

export function clearStoredWorkspaceId() {
  localStorage.removeItem(WORKSPACE_STORAGE_KEY)
}
