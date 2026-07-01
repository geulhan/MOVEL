export type PatternVersionStatus = 'draft' | 'active' | 'archived'

export type PatternVersion = {
  id: string
  project_id: string
  version_label: string
  version_number: number
  status: PatternVersionStatus
  summary: string | null
  learning_count_at_create: number
  agent_run_id: string | null
  raw_result: Record<string, unknown> | null
  confidence: number | null
  created_at: string
  activated_at: string | null
}

export type PatternItem = {
  id: string
  project_id: string
  pattern_version_id: string
  category: string
  label: string
  description: string | null
  formula: string | null
  examples: string[]
  confidence: number | null
  occurrence_count: number
  source_candidate_ids: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type PatternVersionDiff = {
  id: string
  project_id: string
  from_version_id: string
  to_version_id: string
  added_patterns: Array<{ category: string; label: string }>
  strengthened_patterns: Array<{ label: string; category?: string; reason?: string }>
  weakened_patterns: Array<{ label: string; category?: string; reason?: string }>
  removed_patterns: Array<{ category: string; label: string }>
  summary: string | null
  created_at: string
}

export type RunPatternAgentResponse = {
  success: boolean
  agentRunId: string
  versionId: string
  versionLabel: string
  itemCount: number
  confidence: number
  summary: string
}
