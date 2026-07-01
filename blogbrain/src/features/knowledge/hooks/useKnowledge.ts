import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { brainKeys } from '@/features/brain/api/brainApi'
import { projectKeys } from '@/features/projects/api/projectsApi'
import {
  createKnowledgeEntity,
  createRelationship,
  deleteKnowledgeEntity,
  deleteRelationship,
  fetchEntityRelationships,
  fetchKnowledgeEntities,
  fetchRelationships,
  knowledgeKeys,
  updateKnowledgeEntity,
} from '@/features/knowledge/api/knowledgeApi'
import type {
  CreateKnowledgeInput,
  CreateRelationshipInput,
  UpdateKnowledgeInput,
} from '@/features/knowledge/types'

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

export function useKnowledge(projectId: string | undefined, workspaceId?: string) {
  const queryClient = useQueryClient()
  const invalidateBrain = useInvalidateBrain(projectId, workspaceId)

  const entitiesQuery = useQuery({
    queryKey: knowledgeKeys.all(projectId ?? 'none'),
    queryFn: () => fetchKnowledgeEntities(projectId!),
    enabled: Boolean(projectId),
  })

  const relationshipsQuery = useQuery({
    queryKey: knowledgeKeys.relationships(projectId ?? 'none'),
    queryFn: () => fetchRelationships(projectId!),
    enabled: Boolean(projectId),
  })

  const createEntityMutation = useMutation({
    mutationFn: (input: Omit<CreateKnowledgeInput, 'projectId'>) =>
      createKnowledgeEntity({ ...input, projectId: projectId! }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeKeys.all(projectId!) })
      await invalidateBrain()
    },
  })

  const updateEntityMutation = useMutation({
    mutationFn: updateKnowledgeEntity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeKeys.all(projectId!) })
      await queryClient.invalidateQueries({ queryKey: knowledgeKeys.relationships(projectId!) })
      await invalidateBrain()
    },
  })

  const deleteEntityMutation = useMutation({
    mutationFn: deleteKnowledgeEntity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeKeys.all(projectId!) })
      await queryClient.invalidateQueries({ queryKey: knowledgeKeys.relationships(projectId!) })
      await invalidateBrain()
    },
  })

  const createRelationshipMutation = useMutation({
    mutationFn: (input: Omit<CreateRelationshipInput, 'projectId'>) =>
      createRelationship({ ...input, projectId: projectId! }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: knowledgeKeys.relationships(projectId!) })
      await queryClient.invalidateQueries({
        queryKey: knowledgeKeys.entityRelationships(variables.fromEntityId),
      })
      await queryClient.invalidateQueries({
        queryKey: knowledgeKeys.entityRelationships(variables.toEntityId),
      })
      await invalidateBrain()
    },
  })

  const deleteRelationshipMutation = useMutation({
    mutationFn: deleteRelationship,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeKeys.relationships(projectId!) })
      await queryClient.invalidateQueries({ queryKey: ['knowledge', 'entity'] })
      await invalidateBrain()
    },
  })

  return {
    entities: entitiesQuery.data ?? [],
    relationships: relationshipsQuery.data ?? [],
    loading: entitiesQuery.isLoading || relationshipsQuery.isLoading,
    createEntity: (input: Omit<CreateKnowledgeInput, 'projectId'>) =>
      createEntityMutation.mutateAsync(input),
    updateEntity: (input: UpdateKnowledgeInput) => updateEntityMutation.mutateAsync(input),
    deleteEntity: deleteEntityMutation.mutateAsync,
    createRelationship: (input: Omit<CreateRelationshipInput, 'projectId'>) =>
      createRelationshipMutation.mutateAsync(input),
    deleteRelationship: deleteRelationshipMutation.mutateAsync,
    isMutating:
      createEntityMutation.isPending ||
      updateEntityMutation.isPending ||
      deleteEntityMutation.isPending ||
      createRelationshipMutation.isPending ||
      deleteRelationshipMutation.isPending,
  }
}

export function useEntityRelationships(entityId: string | undefined) {
  return useQuery({
    queryKey: knowledgeKeys.entityRelationships(entityId ?? 'none'),
    queryFn: () => fetchEntityRelationships(entityId!),
    enabled: Boolean(entityId),
  })
}
