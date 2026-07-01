import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  createWorkspace,
  ensureDefaultWorkspace,
  fetchWorkspaces,
  workspaceKeys,
} from '@/features/workspace/api/workspaceApi'
import {
  clearStoredWorkspaceId,
  getStoredWorkspaceId,
  setStoredWorkspaceId,
} from '@/lib/workspaceStorage'
import type { Workspace } from '@/types/database'

type WorkspaceContextValue = {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  loading: boolean
  setActiveWorkspaceId: (workspaceId: string) => void
  createWorkspace: (name: string) => Promise<void>
  isCreating: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    () => getStoredWorkspaceId(),
  )

  const workspacesQuery = useQuery({
    queryKey: workspaceKeys.all,
    queryFn: fetchWorkspaces,
    enabled: Boolean(user),
  })

  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      if (!user) return null
      return ensureDefaultWorkspace(user.email)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
    },
  })

  useEffect(() => {
    if (!user || workspacesQuery.isLoading || bootstrapMutation.isPending) return

    if (workspacesQuery.data && workspacesQuery.data.length === 0) {
      bootstrapMutation.mutate()
    }
  }, [user, workspacesQuery.data, workspacesQuery.isLoading, bootstrapMutation.isPending])

  const workspaces = workspacesQuery.data ?? []

  useEffect(() => {
    if (workspaces.length === 0) return

    const storedExists = activeWorkspaceId
      ? workspaces.some((workspace) => workspace.id === activeWorkspaceId)
      : false

    if (!storedExists) {
      const nextId = workspaces[0].id
      setActiveWorkspaceIdState(nextId)
      setStoredWorkspaceId(nextId)
    }
  }, [workspaces, activeWorkspaceId])

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  )

  const setActiveWorkspaceId = useCallback((workspaceId: string) => {
    setActiveWorkspaceIdState(workspaceId)
    setStoredWorkspaceId(workspaceId)
  }, [])

  const createWorkspaceMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      setActiveWorkspaceId(workspace.id)
    },
  })

  useEffect(() => {
    if (!user) {
      setActiveWorkspaceIdState(null)
      clearStoredWorkspaceId()
    }
  }, [user])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      activeWorkspace,
      loading: workspacesQuery.isLoading || bootstrapMutation.isPending,
      setActiveWorkspaceId,
      createWorkspace: async (name: string) => {
        await createWorkspaceMutation.mutateAsync(name)
      },
      isCreating: createWorkspaceMutation.isPending,
    }),
    [
      workspaces,
      activeWorkspace,
      workspacesQuery.isLoading,
      bootstrapMutation.isPending,
      setActiveWorkspaceId,
      createWorkspaceMutation,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}
