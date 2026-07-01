import { supabase } from '@/lib/supabase/client'
import type {
  PatternItem,
  PatternVersion,
  PatternVersionDiff,
  RunPatternAgentResponse,
} from '@/features/patterns/types'

export async function invokePatternAgent(projectId: string): Promise<RunPatternAgentResponse> {
  const { data, error } = await supabase.functions.invoke('run-pattern-agent', {
    body: { projectId },
  })

  if (error) throw error
  if (data?.error) throw new Error(String(data.error))

  return data as RunPatternAgentResponse
}

export async function fetchPatternVersions(projectId: string): Promise<PatternVersion[]> {
  const { data, error } = await supabase
    .from('pattern_versions')
    .select('*')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return (data ?? []).map(normalizeVersion)
}

export async function fetchPatternItems(versionId: string): Promise<PatternItem[]> {
  const { data, error } = await supabase
    .from('pattern_items')
    .select('*')
    .eq('pattern_version_id', versionId)
    .order('category')
    .order('confidence', { ascending: false })

  if (error) throw error
  return (data ?? []).map(normalizeItem)
}

export async function fetchLatestPatternDiff(
  projectId: string,
): Promise<PatternVersionDiff | null> {
  const { data, error } = await supabase
    .from('pattern_version_diffs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return normalizeDiff(data)
}

function normalizeVersion(row: Record<string, unknown>): PatternVersion {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    version_label: row.version_label as string,
    version_number: Number(row.version_number),
    status: row.status as PatternVersion['status'],
    summary: row.summary as string | null,
    learning_count_at_create: row.learning_count_at_create as number,
    agent_run_id: row.agent_run_id as string | null,
    raw_result: row.raw_result as Record<string, unknown> | null,
    confidence: row.confidence as number | null,
    created_at: row.created_at as string,
    activated_at: row.activated_at as string | null,
  }
}

function normalizeItem(row: Record<string, unknown>): PatternItem {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    pattern_version_id: row.pattern_version_id as string,
    category: row.category as string,
    label: row.label as string,
    description: row.description as string | null,
    formula: row.formula as string | null,
    examples: Array.isArray(row.examples) ? (row.examples as string[]) : [],
    confidence: row.confidence as number | null,
    occurrence_count: row.occurrence_count as number,
    source_candidate_ids: Array.isArray(row.source_candidate_ids)
      ? (row.source_candidate_ids as string[])
      : [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function normalizeDiff(row: Record<string, unknown>): PatternVersionDiff {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    from_version_id: row.from_version_id as string,
    to_version_id: row.to_version_id as string,
    added_patterns: (row.added_patterns as PatternVersionDiff['added_patterns']) ?? [],
    strengthened_patterns: (row.strengthened_patterns as PatternVersionDiff['strengthened_patterns']) ?? [],
    weakened_patterns: (row.weakened_patterns as PatternVersionDiff['weakened_patterns']) ?? [],
    removed_patterns: (row.removed_patterns as PatternVersionDiff['removed_patterns']) ?? [],
    summary: row.summary as string | null,
    created_at: row.created_at as string,
  }
}

export const patternKeys = {
  versions: (projectId: string) => ['patterns', projectId, 'versions'] as const,
  items: (versionId: string) => ['patterns', 'items', versionId] as const,
  diff: (projectId: string) => ['patterns', projectId, 'diff'] as const,
}
