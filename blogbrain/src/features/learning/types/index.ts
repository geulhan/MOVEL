import type { ProjectSource } from '@/features/sources/types'

import type { AnalysisStatus } from '@/ai/types'

export type { AnalysisStatus }

export type LearningArticle = {
  id: string
  project_id: string
  title: string
  body: string
  source_url: string | null
  project_source_id: string | null
  memo: string | null
  analysis_status: AnalysisStatus
  analysis_error: string | null
  analyzed_at: string | null
  created_at: string
  updated_at: string
}

export type LearningTag = {
  id: string
  learning_article_id: string
  tag: string
  created_at: string
}

export type LearningArticleWithMeta = LearningArticle & {
  learning_tags: LearningTag[]
  project_sources: Pick<ProjectSource, 'id' | 'name' | 'source_type'> | null
}

export type CreateLearningInput = {
  projectId: string
  title: string
  body: string
  sourceUrl?: string
  projectSourceId?: string | null
  memo?: string
  tags?: string[]
}

export type UpdateLearningInput = {
  articleId: string
  title?: string
  body?: string
  sourceUrl?: string | null
  projectSourceId?: string | null
  memo?: string | null
  tags?: string[]
}
