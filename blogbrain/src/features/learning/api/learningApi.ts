import { supabase } from '@/lib/supabase/client'
import type {
  CreateLearningInput,
  LearningArticleWithMeta,
  UpdateLearningInput,
} from '@/features/learning/types'

const LEARNING_SELECT = `
  *,
  learning_tags(*),
  project_sources(id, name, source_type)
`

export async function fetchLearningArticles(
  projectId: string,
): Promise<LearningArticleWithMeta[]> {
  const { data, error } = await supabase
    .from('learning_articles')
    .select(LEARNING_SELECT)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(normalizeLearningArticle)
}

export async function fetchLearningArticle(
  articleId: string,
): Promise<LearningArticleWithMeta | null> {
  const { data, error } = await supabase
    .from('learning_articles')
    .select(LEARNING_SELECT)
    .eq('id', articleId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return normalizeLearningArticle(data)
}

function normalizeLearningArticle(row: Record<string, unknown>): LearningArticleWithMeta {
  const tags = row.learning_tags
  const source = row.project_sources

  return {
    id: row.id as string,
    project_id: row.project_id as string,
    title: row.title as string,
    body: row.body as string,
    source_url: row.source_url as string | null,
    project_source_id: row.project_source_id as string | null,
    memo: row.memo as string | null,
    analysis_status: (row.analysis_status as LearningArticleWithMeta['analysis_status']) ?? 'pending',
    analysis_error: (row.analysis_error as string | null) ?? null,
    analyzed_at: (row.analyzed_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    learning_tags: Array.isArray(tags) ? tags : [],
    project_sources: source && typeof source === 'object' && !Array.isArray(source)
      ? (source as LearningArticleWithMeta['project_sources'])
      : null,
  }
}

async function syncLearningTags(articleId: string, tags: string[]): Promise<void> {
  const normalized = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]

  const { error: deleteError } = await supabase
    .from('learning_tags')
    .delete()
    .eq('learning_article_id', articleId)

  if (deleteError) throw deleteError

  if (normalized.length === 0) return

  const { error: insertError } = await supabase.from('learning_tags').insert(
    normalized.map((tag) => ({
      learning_article_id: articleId,
      tag,
    })),
  )

  if (insertError) throw insertError
}

export async function createLearningArticle(
  input: CreateLearningInput,
): Promise<LearningArticleWithMeta> {
  const { data, error } = await supabase
    .from('learning_articles')
    .insert({
      project_id: input.projectId,
      title: input.title,
      body: input.body,
      source_url: input.sourceUrl ?? null,
      project_source_id: input.projectSourceId ?? null,
      memo: input.memo ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  if (input.tags && input.tags.length > 0) {
    await syncLearningTags(data.id, input.tags)
  }

  const article = await fetchLearningArticle(data.id)
  if (!article) throw new Error('학습 글을 불러오지 못했습니다.')
  return article
}

export async function updateLearningArticle(
  input: UpdateLearningInput,
): Promise<LearningArticleWithMeta> {
  const { error } = await supabase
    .from('learning_articles')
    .update({
      title: input.title,
      body: input.body,
      source_url: input.sourceUrl,
      project_source_id: input.projectSourceId,
      memo: input.memo,
    })
    .eq('id', input.articleId)

  if (error) throw error

  if (input.tags) {
    await syncLearningTags(input.articleId, input.tags)
  }

  const article = await fetchLearningArticle(input.articleId)
  if (!article) throw new Error('학습 글을 불러오지 못했습니다.')
  return article
}

export async function deleteLearningArticle(articleId: string): Promise<void> {
  const { error } = await supabase.from('learning_articles').delete().eq('id', articleId)
  if (error) throw error
}

export const learningKeys = {
  all: (projectId: string) => ['learning', projectId] as const,
  detail: (articleId: string) => ['learning', 'detail', articleId] as const,
}
