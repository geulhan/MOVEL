import { useQuery } from '@tanstack/react-query'
import {
  brainKeys,
  fetchBrainActivity,
  fetchBrainMemory,
  fetchProjectBrain,
} from '@/features/brain/api/brainApi'

export function useBrain(projectId: string | undefined) {
  const brainQuery = useQuery({
    queryKey: brainKeys.brain(projectId ?? 'none'),
    queryFn: () => fetchProjectBrain(projectId!),
    enabled: Boolean(projectId),
  })

  const memoryQuery = useQuery({
    queryKey: brainKeys.memory(projectId ?? 'none'),
    queryFn: () => fetchBrainMemory(projectId!),
    enabled: Boolean(projectId),
  })

  const activityQuery = useQuery({
    queryKey: brainKeys.activity(projectId ?? 'none'),
    queryFn: () => fetchBrainActivity(projectId!),
    enabled: Boolean(projectId),
  })

  return {
    brain: brainQuery.data ?? null,
    memory: memoryQuery.data ?? null,
    activity: activityQuery.data ?? [],
    loading: brainQuery.isLoading || memoryQuery.isLoading,
  }
}
