import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { brainKeys } from '@/features/brain/api/brainApi'
import { projectKeys } from '@/features/projects/api/projectsApi'
import {
  createLearningArticle,
  deleteLearningArticle,
  fetchLearningArticles,
  learningKeys,
  updateLearningArticle,
} from '@/features/learning/api/learningApi'
import type { CreateLearningInput, UpdateLearningInput } from '@/features/learning/types'

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

export function useLearning(projectId: string | undefined, workspaceId?: string) {
  const queryClient = useQueryClient()
  const invalidateBrain = useInvalidateBrain(projectId, workspaceId)

  const query = useQuery({
    queryKey: learningKeys.all(projectId ?? 'none'),
    queryFn: () => fetchLearningArticles(projectId!),
    enabled: Boolean(projectId),
  })

  const createMutation = useMutation({
    mutationFn: (input: Omit<CreateLearningInput, 'projectId'>) =>
      createLearningArticle({ ...input, projectId: projectId! }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: learningKeys.all(projectId!) })
      await invalidateBrain()
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateLearningArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: learningKeys.all(projectId!) })
      await invalidateBrain()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLearningArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: learningKeys.all(projectId!) })
      await invalidateBrain()
    },
  })

  return {
    articles: query.data ?? [],
    loading: query.isLoading,
    createArticle: (input: Omit<CreateLearningInput, 'projectId'>) => createMutation.mutateAsync(input),
    updateArticle: (input: UpdateLearningInput) => updateMutation.mutateAsync(input),
    deleteArticle: deleteMutation.mutateAsync,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  }
}
