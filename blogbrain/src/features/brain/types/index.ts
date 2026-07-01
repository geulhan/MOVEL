export const BRAIN_ACTIVITY_TYPES = [
  'source_created',
  'source_updated',
  'source_deleted',
  'knowledge_created',
  'knowledge_updated',
  'knowledge_deleted',
  'relationship_created',
  'relationship_deleted',
  'learning_created',
  'learning_updated',
  'learning_deleted',
  'learning_analyzed',
  'pattern_discovered',
  'agent_run_failed',
  'pattern_version_created',
  'pattern_agent_completed',
] as const

export type BrainActivityType = (typeof BRAIN_ACTIVITY_TYPES)[number]

export type BrainActivityLog = {
  id: string
  project_id: string
  activity_type: BrainActivityType
  entity_id: string | null
  title: string
  summary: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type BrainScoreBreakdown = {
  learning: number
  knowledge: number
  relationships: number
  sources: number
  formula: string
}

export type BrainMemorySnapshot = {
  recentLearning: Array<{ id: string; title: string; created_at: string }>
  recentKnowledge: Array<{ id: string; name: string; entity_type: string; created_at: string }>
  recentSources: Array<{ id: string; name: string; source_type: string; created_at: string }>
  recentActivity: BrainActivityLog[]
}

export type BrainScoreInput = {
  learning: number
  knowledge: number
  relationships: number
  sources: number
}

export function calculateBrainScore(input: BrainScoreInput): number {
  const raw =
    input.learning * 2 +
    input.knowledge * 1 +
    input.relationships * 1 +
    input.sources * 0.5

  return Math.min(100, Math.round(raw))
}
