import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import type { LearningAnalysisResult } from './learningAnalysisSchema.ts'
import { PROMPT_VERSION } from './learningAnalysisSchema.ts'

type LearningArticle = {
  id: string
  project_id: string
  title: string
  body: string
  source_url: string | null
  memo: string | null
}

async function upsertKnowledgeEntity(
  admin: SupabaseClient,
  projectId: string,
  name: string,
  entityType: 'person' | 'brand' | 'keyword' | 'category',
  tags: string[] = [],
): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const { data, error } = await admin
    .from('knowledge_entities')
    .upsert(
      {
        project_id: projectId,
        name: trimmed,
        entity_type: entityType,
        tags,
      },
      { onConflict: 'project_id,entity_type,name' },
    )
    .select('id')
    .single()

  if (error) {
    console.error('Knowledge upsert error:', error.message)
    return null
  }

  return data.id as string
}

async function linkEntities(
  admin: SupabaseClient,
  projectId: string,
  fromId: string,
  toId: string,
): Promise<void> {
  if (fromId === toId) return

  await admin.from('knowledge_relationships').upsert(
    {
      project_id: projectId,
      from_entity_id: fromId,
      to_entity_id: toId,
      relation_type: 'related_to',
    },
    { onConflict: 'from_entity_id,to_entity_id,relation_type', ignoreDuplicates: true },
  )
}

function buildPatternCandidates(
  projectId: string,
  articleId: string,
  analysisId: string,
  result: LearningAnalysisResult,
) {
  const confidence = result.confidence
  const rows = [
    {
      project_id: projectId,
      learning_article_id: articleId,
      learning_analysis_id: analysisId,
      category: 'title_pattern',
      label: result.title_pattern.slice(0, 120) || 'title_pattern',
      value: { pattern: result.title_pattern },
      confidence,
    },
    {
      project_id: projectId,
      learning_article_id: articleId,
      learning_analysis_id: analysisId,
      category: 'intro_pattern',
      label: result.intro_pattern.slice(0, 120) || 'intro_pattern',
      value: { pattern: result.intro_pattern },
      confidence,
    },
    {
      project_id: projectId,
      learning_article_id: articleId,
      learning_analysis_id: analysisId,
      category: 'writing_style',
      label: result.writing_style.slice(0, 120) || 'writing_style',
      value: { style: result.writing_style },
      confidence,
    },
    {
      project_id: projectId,
      learning_article_id: articleId,
      learning_analysis_id: analysisId,
      category: 'paragraph_length',
      label: 'paragraph_length',
      value: result.paragraph_length,
      confidence,
    },
  ]

  if (result.cta) {
    rows.push({
      project_id: projectId,
      learning_article_id: articleId,
      learning_analysis_id: analysisId,
      category: 'cta',
      label: result.cta.slice(0, 120),
      value: { cta: result.cta },
      confidence,
    })
  }

  for (const word of result.emotion_words.slice(0, 10)) {
    rows.push({
      project_id: projectId,
      learning_article_id: articleId,
      learning_analysis_id: analysisId,
      category: 'emotion_word',
      label: word,
      value: { word },
      confidence,
    })
  }

  for (const expression of result.new_patterns.new_expressions.slice(0, 10)) {
    rows.push({
      project_id: projectId,
      learning_article_id: articleId,
      learning_analysis_id: analysisId,
      category: 'new_expression',
      label: expression.slice(0, 120),
      value: { expression },
      confidence,
    })
  }

  for (const word of result.new_patterns.new_words.slice(0, 10)) {
    rows.push({
      project_id: projectId,
      learning_article_id: articleId,
      learning_analysis_id: analysisId,
      category: 'new_word',
      label: word.slice(0, 120),
      value: { word },
      confidence,
    })
  }

  return rows
}

export async function applyLearningPipeline(
  admin: SupabaseClient,
  article: LearningArticle,
  agentRunId: string,
  result: LearningAnalysisResult,
  provider: string,
  model: string,
): Promise<{ analysisId: string }> {
  const { data: analysis, error: analysisError } = await admin
    .from('learning_analyses')
    .upsert(
      {
        learning_article_id: article.id,
        project_id: article.project_id,
        agent_run_id: agentRunId,
        agent_name: 'learning_agent',
        provider,
        model,
        raw_result: result,
        confidence: result.confidence,
        prompt_version: PROMPT_VERSION,
      },
      { onConflict: 'learning_article_id' },
    )
    .select('id')
    .single()

  if (analysisError) throw analysisError

  const analysisId = analysis.id as string

  await admin
    .from('pattern_candidates')
    .delete()
    .eq('learning_article_id', article.id)

  const candidates = buildPatternCandidates(
    article.project_id,
    article.id,
    analysisId,
    result,
  )

  if (candidates.length > 0) {
    const { error: candidateError } = await admin.from('pattern_candidates').insert(candidates)
    if (candidateError) throw candidateError
  }

  const personIds: string[] = []
  const brandIds: string[] = []

  for (const entity of result.entities) {
    const id = await upsertKnowledgeEntity(admin, article.project_id, entity, 'person')
    if (id) personIds.push(id)
  }

  for (const brand of result.brands) {
    const id = await upsertKnowledgeEntity(admin, article.project_id, brand, 'brand')
    if (id) brandIds.push(id)
  }

  for (const keyword of [...result.keywords, ...result.seo_keywords]) {
    await upsertKnowledgeEntity(admin, article.project_id, keyword, 'keyword')
  }

  if (result.category) {
    await upsertKnowledgeEntity(admin, article.project_id, result.category, 'category')
  }

  if (personIds.length > 0 && brandIds.length > 0) {
    await linkEntities(admin, article.project_id, personIds[0], brandIds[0])
  }

  await admin.from('learning_articles').update({
    analysis_status: 'completed',
    analysis_error: null,
    analyzed_at: new Date().toISOString(),
  }).eq('id', article.id)

  await admin.from('brain_activity_logs').insert({
    project_id: article.project_id,
    activity_type: 'learning_analyzed',
    entity_id: analysisId,
    title: article.title,
    summary: `confidence ${result.confidence}`,
    metadata: { agent: 'learning_agent', learning_article_id: article.id },
  })

  if (candidates.length > 0) {
    await admin.from('brain_activity_logs').insert({
      project_id: article.project_id,
      activity_type: 'pattern_discovered',
      entity_id: analysisId,
      title: `${candidates.length} pattern candidates`,
      summary: result.title_pattern,
      metadata: { learning_article_id: article.id },
    })
  }

  await admin.rpc('recompute_project_brain', { p_project_id: article.project_id })

  return { analysisId }
}
