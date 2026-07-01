import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkspace } from '@/features/workspace/hooks/useWorkspaceContext'
import {
  createProject,
  deleteProject,
  fetchProjectBySlug,
  fetchProjects,
  getProjectBrain,
  projectKeys,
  updateProject,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '@/features/projects/api/projectsApi'
import {
  clearStoredProjectId,
  getStoredProjectId,
  setStoredProjectId,
} from '@/lib/projectStorage'
import type { ProjectBrain, ProjectWithBrain } from '@/types/database'

type ProjectContextValue = {
  projects: ProjectWithBrain[]
  activeProject: ProjectWithBrain | null
  activeBrain: ProjectBrain | null
  loading: boolean
  setActiveProjectSlug: (slug: string) => void
  createProject: (input: Omit<CreateProjectInput, 'workspaceId'>) => Promise<ProjectWithBrain>
  updateProject: (input: UpdateProjectInput) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  isMutating: boolean
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { projectSlug } = useParams()
  const queryClient = useQueryClient()
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id

  const projectsQuery = useQuery({
    queryKey: projectKeys.all(workspaceId ?? 'none'),
    queryFn: () => fetchProjects(workspaceId!),
    enabled: Boolean(workspaceId),
  })

  const projectDetailQuery = useQuery({
    queryKey: projectKeys.detail(workspaceId ?? 'none', projectSlug ?? 'none'),
    queryFn: () => fetchProjectBySlug(workspaceId!, projectSlug!),
    enabled: Boolean(workspaceId && projectSlug),
  })

  const projects = projectsQuery.data ?? []

  const activeProject = useMemo(() => {
    if (projectSlug && projectDetailQuery.data) {
      return projectDetailQuery.data
    }

    const storedId = getStoredProjectId()
    if (storedId) {
      const matched = projects.find((project) => project.id === storedId)
      if (matched) return matched
    }

    return projects[0] ?? null
  }, [projectSlug, projectDetailQuery.data, projects])

  const activeBrain = useMemo(
    () => (activeProject ? getProjectBrain(activeProject) : null),
    [activeProject],
  )

  useEffect(() => {
    if (activeProject) {
      setStoredProjectId(activeProject.id)
    }
  }, [activeProject])

  useEffect(() => {
    if (!workspaceId) {
      clearStoredProjectId()
    }
  }, [workspaceId])

  const invalidateProjects = useCallback(async () => {
    if (!workspaceId) return
    await queryClient.invalidateQueries({ queryKey: projectKeys.all(workspaceId) })
    if (projectSlug) {
      await queryClient.invalidateQueries({
        queryKey: projectKeys.detail(workspaceId, projectSlug),
      })
    }
  }, [queryClient, workspaceId, projectSlug])

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateProjectInput, 'workspaceId'>) =>
      createProject({ ...input, workspaceId: workspaceId! }),
    onSuccess: async (project) => {
      await invalidateProjects()
      navigate(`/p/${project.slug}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateProject,
    onSuccess: invalidateProjects,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await invalidateProjects()
      navigate('/projects')
    },
  })

  const setActiveProjectSlug = useCallback(
    (slug: string) => {
      navigate(`/p/${slug}`)
    },
    [navigate],
  )

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      activeProject,
      activeBrain,
      loading: projectsQuery.isLoading || projectDetailQuery.isLoading,
      setActiveProjectSlug,
      createProject: createMutation.mutateAsync,
      updateProject: async (input) => {
        await updateMutation.mutateAsync(input)
      },
      deleteProject: deleteMutation.mutateAsync,
      isMutating:
        createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    }),
    [
      projects,
      activeProject,
      activeBrain,
      projectsQuery.isLoading,
      projectDetailQuery.isLoading,
      setActiveProjectSlug,
      createMutation,
      updateMutation,
      deleteMutation,
    ],
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
