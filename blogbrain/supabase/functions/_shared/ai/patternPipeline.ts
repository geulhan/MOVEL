import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  PATTERN_FIELD_TO_CATEGORY,
  type PatternAnalysisResult,
  type PatternItemResult,
} from './patternAnalysisSchema.ts'

type PatternVersionRow = {
  id: string
  version_label: string
  version_number: number
}

function nextVersionLabel(existing: PatternVersionRow[]): { label: string; number: number } {
  if (existing.length === 0) {
    return { label: 'v1.0', number: 1.0 }
  }

  const latest = existing.reduce((max, row) =>
    row.version_number > max.version_number ? row : max,
  )

  const nextNumber = Math.round((latest.version_number + 0.1) * 10) / 10
  return { label: `v${nextNumber.toFixed(1)}`, number: nextNumber }
}

function flattenPatternItems(
  result: PatternAnalysisResult,
): Array<{ category: string; item: PatternItemResult }> {
  const rows: Array<{ category: string; item: PatternItemResult }> = []

  for (const [field, category] of Object.entries(PATTERN_FIELD_TO_CATEGORY)) {
    const items = result[field as keyof PatternAnalysisResult]
    if (!Array.isArray(items)) continue

    for (const item of items as PatternItemResult[]) {
      rows.push({ category, item })
    }
  }

  return rows
}

function diffPatternLabels(
  previous: Array<{ category: string; label: string }>,
  current: Array<{ category: string; label: string }>,
) {
  const prevKeys = new Set(previous.map((p) => `${p.category}::${p.label}`))
  const currKeys = new Set(current.map((p) => `${p.category}::${p.label}`))

  const added = current.filter((p) => !prevKeys.has(`${p.category}::${p.label}`))
  const removed = previous.filter((p) => !currKeys.has(`${p.category}::${p.label}`))

  return { added, removed }
}

export async function applyPatternPipeline(
  admin: SupabaseClient,
  projectId: string,
  agentRunId: string,
  result: PatternAnalysisResult,
  provider: string,
  model: string,
): Promise<{ versionId: string; versionLabel: string; itemCount: number }> {
  const { count: learningCount } = await admin
    .from('learning_articles')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('analysis_status', 'completed')

  const { data: existingVersions } = await admin
    .from('pattern_versions')
    .select('id, version_label, version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })

  const { label, number } = nextVersionLabel((existingVersions ?? []) as PatternVersionRow[])
  const previousActive = (existingVersions ?? [])[0] as PatternVersionRow | undefined

  if (previousActive) {
    await admin
      .from('pattern_versions')
      .update({ status: 'archived' })
      .eq('id', previousActive.id)
  }

  const { data: version, error: versionError } = await admin
    .from('pattern_versions')
    .insert({
      project_id: projectId,
      version_label: label,
      version_number: number,
      status: 'active',
      summary: result.summary,
      learning_count_at_create: learningCount ?? 0,
      agent_run_id: agentRunId,
      raw_result: result,
      confidence: result.confidence,
      activated_at: new Date().toISOString(),
    })
    .select('id, version_label')
    .single()

  if (versionError) throw versionError

  const flatItems = flattenPatternItems(result)
  const itemRows = flatItems.map(({ category, item }) => ({
    project_id: projectId,
    pattern_version_id: version.id,
    category,
    label: item.label,
    description: item.description || null,
    formula: item.formula || null,
    examples: item.examples,
    confidence: item.confidence,
    occurrence_count: item.occurrence_count,
    source_candidate_ids: item.source_candidate_ids,
    metadata: {},
  }))

  if (itemRows.length > 0) {
    const { error: itemsError } = await admin.from('pattern_items').insert(itemRows)
    if (itemsError) throw itemsError
  }

  if (previousActive) {
    const { data: prevItems } = await admin
      .from('pattern_items')
      .select('category, label')
      .eq('pattern_version_id', previousActive.id)

    const { added, removed } = diffPatternLabels(
      (prevItems ?? []) as Array<{ category: string; label: string }>,
      itemRows.map((row) => ({ category: row.category, label: row.label })),
    )

    await admin.from('pattern_version_diffs').insert({
      project_id: projectId,
      from_version_id: previousActive.id,
      to_version_id: version.id,
      added_patterns: added,
      strengthened_patterns: result.strengthened_patterns,
      weakened_patterns: result.removed_or_weakened_patterns,
      removed_patterns: removed,
      summary: result.summary,
    })
  }

  await admin
    .from('project_brains')
    .update({
      current_pattern_version_id: version.id,
      current_version_label: version.version_label,
    })
    .eq('project_id', projectId)

  await admin.from('brain_activity_logs').insert([
    {
      project_id: projectId,
      activity_type: 'pattern_version_created',
      entity_id: version.id,
      title: `Pattern ${version.version_label}`,
      summary: result.summary,
      metadata: { agent: 'pattern_agent', provider, model },
    },
    {
      project_id: projectId,
      activity_type: 'pattern_agent_completed',
      entity_id: version.id,
      title: `${itemRows.length} patterns synthesized`,
      summary: `confidence ${result.confidence}`,
      metadata: { version_label: version.version_label },
    },
  ])

  await admin.rpc('recompute_project_brain', { p_project_id: projectId })

  return {
    versionId: version.id as string,
    versionLabel: version.version_label as string,
    itemCount: itemRows.length,
  }
}

export async function gatherPatternContext(
  admin: SupabaseClient,
  projectId: string,
): Promise<{
  learningCount: number
  candidates: Array<Record<string, unknown>>
  analyses: Array<Record<string, unknown>>
  existingPatterns: Array<Record<string, unknown>>
}> {
  const { data: candidates, error: cErr } = await admin
    .from('pattern_candidates')
    .select('id, category, label, value, confidence')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (cErr) throw cErr

  const { data: analysesRaw, error: aErr } = await admin
    .from('learning_analyses')
    .select('id, raw_result, confidence')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (aErr) throw aErr

  const analyses = (analysesRaw ?? []).map((row) => {
    const raw = row.raw_result as Record<string, unknown>
    return {
      id: row.id,
      title_pattern: raw.title_pattern,
      intro_pattern: raw.intro_pattern,
      writing_style: raw.writing_style,
      category: raw.category,
      confidence: row.confidence,
    }
  })

  const { data: brain } = await admin
    .from('project_brains')
    .select('current_pattern_version_id')
    .eq('project_id', projectId)
    .maybeSingle()

  let existingPatterns: Array<Record<string, unknown>> = []

  if (brain?.current_pattern_version_id) {
    const { data: items } = await admin
      .from('pattern_items')
      .select('category, label, formula, confidence, examples')
      .eq('pattern_version_id', brain.current_pattern_version_id)

    existingPatterns = items ?? []
  }

  const { count: learningCount } = await admin
    .from('learning_articles')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('analysis_status', 'completed')

  return {
    learningCount: learningCount ?? 0,
    candidates: candidates ?? [],
    analyses,
    existingPatterns,
  }
}
