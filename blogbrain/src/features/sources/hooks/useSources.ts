import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSource,
  deleteSource,
  fetchSources,
  sourceKeys,
  updateSource,
} from '@/features/sources/api/sourcesApi'
import type { CreateSourceInput, UpdateSourceInput } from '@/features/sources/types'
import { brainKeys } from '@/features/brain/api/brainApi'
import { projectKeys } from '@/features/projects/api/projectsApi'

function useInvalidateBrain(projectId: string | undefined, workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return async () => {
    if (!projectId) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: brainKeys.brain(projectId) }),
      queryClient.invalidateQueries({ queryKey: brainKeys.memory(projectId) }),
      queryClient.invalidateQueries({ queryKey: brainKeys.activity(projectId) }),
      workspaceId
        ? queryClient.invalidateQueries({ queryKey: projectKeys.all(workspaceId) })
        : Promise.resolve(),
    ])
  }
}

export function useSources(projectId: string | undefined, workspaceId?: string) {
  const queryClient = useQueryClient()
  const invalidateBrain = useInvalidateBrain(projectId, workspaceId)

  const query = useQuery({
    queryKey: sourceKeys.all(projectId ?? 'none'),
    queryFn: () => fetchSources(projectId!),
    enabled: Boolean(projectId),
  })

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateSourceInput, 'projectId'>) =>
      createSource({ ...input, projectId: projectId! }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sourceKeys.all(projectId!) })
      await invalidateBrain()
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateSource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sourceKeys.all(projectId!) })
      await invalidateBrain()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sourceKeys.all(projectId!) })
      await invalidateBrain()
    },
  })

  return {
    sources: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    createSource: (input: Omit<CreateSourceInput, 'projectId'>) => createMutation.mutateAsync(input),
    updateSource: (input: UpdateSourceInput) => updateMutation.mutateAsync(input),
    deleteSource: deleteMutation.mutateAsync,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  }
}
