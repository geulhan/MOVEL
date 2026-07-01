import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchLatestPatternDiff,
  fetchPatternItems,
  fetchPatternVersions,
  invokePatternAgent,
  patternKeys,
} from '@/features/patterns/api/patternsApi'
import { brainKeys } from '@/features/brain/api/brainApi'
import { projectKeys } from '@/features/projects/api/projectsApi'
import { agentKeys } from '@/features/agents/api/agentsApi'

export function usePatterns(projectId: string | undefined, workspaceId?: string) {
  const queryClient = useQueryClient()
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  const versionsQuery = useQuery({
    queryKey: patternKeys.versions(projectId ?? 'none'),
    queryFn: () => fetchPatternVersions(projectId!),
    enabled: Boolean(projectId),
  })

  const versions = versionsQuery.data ?? []
  const activeVersion = versions.find((v) => v.status === 'active') ?? versions[0] ?? null

  useEffect(() => {
    if (!selectedVersionId && activeVersion) {
      setSelectedVersionId(activeVersion.id)
    }
  }, [activeVersion, selectedVersionId])

  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) ?? activeVersion

  const itemsQuery = useQuery({
    queryKey: patternKeys.items(selectedVersion?.id ?? 'none'),
    queryFn: () => fetchPatternItems(selectedVersion!.id),
    enabled: Boolean(selectedVersion?.id),
  })

  const diffQuery = useQuery({
    queryKey: patternKeys.diff(projectId ?? 'none'),
    queryFn: () => fetchLatestPatternDiff(projectId!),
    enabled: Boolean(projectId),
  })

  const invalidateAll = async () => {
    if (!projectId) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: patternKeys.versions(projectId) }),
      queryClient.invalidateQueries({ queryKey: patternKeys.diff(projectId) }),
      queryClient.invalidateQueries({ queryKey: brainKeys.brain(projectId) }),
      queryClient.invalidateQueries({ queryKey: brainKeys.memory(projectId) }),
      queryClient.invalidateQueries({ queryKey: brainKeys.activity(projectId) }),
      queryClient.invalidateQueries({ queryKey: agentKeys.runs(projectId) }),
      workspaceId
        ? queryClient.invalidateQueries({ queryKey: projectKeys.all(workspaceId) })
        : Promise.resolve(),
    ])
    if (selectedVersion?.id) {
      await queryClient.invalidateQueries({ queryKey: patternKeys.items(selectedVersion.id) })
    }
  }

  const runMutation = useMutation({
    mutationFn: () => invokePatternAgent(projectId!),
    onSuccess: async (result) => {
      setSelectedVersionId(result.versionId)
      await invalidateAll()
    },
  })

  const averageConfidence = useMemo(() => {
    const items = itemsQuery.data ?? []
    if (items.length === 0) return 0
    const sum = items.reduce((acc, item) => acc + (item.confidence ?? 0), 0)
    return sum / items.length
  }, [itemsQuery.data])

  return {
    versions,
    activeVersion,
    selectedVersion,
    setSelectedVersionId,
    items: itemsQuery.data ?? [],
    diff: diffQuery.data ?? null,
    loading: versionsQuery.isLoading || itemsQuery.isLoading,
    averageConfidence,
    runPatternAgent: runMutation.mutateAsync,
    isRunning: runMutation.isPending,
    error: runMutation.error,
  }
}
