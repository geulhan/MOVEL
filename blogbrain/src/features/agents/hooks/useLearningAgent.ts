import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  agentKeys,
  fetchAgentRuns,
  fetchLearningAnalyses,
  fetchLearningAnalysis,
  fetchPatternCandidates,
  invokeLearningAgent,
} from '@/features/agents/api/agentsApi'
import { brainKeys } from '@/features/brain/api/brainApi'
import { knowledgeKeys } from '@/features/knowledge/api/knowledgeApi'
import { learningKeys } from '@/features/learning/api/learningApi'
import { projectKeys } from '@/features/projects/api/projectsApi'

export function useLearningAgent(projectId: string | undefined, workspaceId?: string) {
  const queryClient = useQueryClient()

  const invalidateAll = async () => {
    if (!projectId) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: learningKeys.all(projectId) }),
      queryClient.invalidateQueries({ queryKey: agentKeys.analyses(projectId) }),
      queryClient.invalidateQueries({ queryKey: agentKeys.runs(projectId) }),
      queryClient.invalidateQueries({ queryKey: agentKeys.patterns(projectId) }),
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.all(projectId) }),
      queryClient.invalidateQueries({ queryKey: brainKeys.brain(projectId) }),
      queryClient.invalidateQueries({ queryKey: brainKeys.memory(projectId) }),
      queryClient.invalidateQueries({ queryKey: brainKeys.activity(projectId) }),
      workspaceId
        ? queryClient.invalidateQueries({ queryKey: projectKeys.all(workspaceId) })
        : Promise.resolve(),
    ])
  }

  const runMutation = useMutation({
    mutationFn: invokeLearningAgent,
    onSuccess: invalidateAll,
  })

  return {
    runAgent: runMutation.mutateAsync,
    isRunning: runMutation.isPending,
    error: runMutation.error,
  }
}

export function useLearningAnalyses(projectId: string | undefined) {
  return useQuery({
    queryKey: agentKeys.analyses(projectId ?? 'none'),
    queryFn: () => fetchLearningAnalyses(projectId!),
    enabled: Boolean(projectId),
  })
}

export function useLearningAnalysis(articleId: string | undefined) {
  return useQuery({
    queryKey: agentKeys.analysis(articleId ?? 'none'),
    queryFn: () => fetchLearningAnalysis(articleId!),
    enabled: Boolean(articleId),
  })
}

export function useAgentRuns(projectId: string | undefined) {
  return useQuery({
    queryKey: agentKeys.runs(projectId ?? 'none'),
    queryFn: () => fetchAgentRuns(projectId!),
    enabled: Boolean(projectId),
  })
}

export function usePatternCandidates(projectId: string | undefined) {
  return useQuery({
    queryKey: agentKeys.patterns(projectId ?? 'none'),
    queryFn: () => fetchPatternCandidates(projectId!),
    enabled: Boolean(projectId),
  })
}
