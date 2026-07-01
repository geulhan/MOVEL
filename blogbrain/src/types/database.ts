import type { BrainActivityType } from '@/features/brain/types'
import type { KnowledgeEntityType } from '@/features/knowledge/types'
import type { SourceType } from '@/features/sources/types'

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  preferences: {
    theme?: 'light' | 'dark' | 'system'
  }
  created_at: string
  updated_at: string
}

export type Workspace = {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'team'
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type WorkspaceMember = {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  invited_at: string | null
  joined_at: string
}

export type Project = {
  id: string
  workspace_id: string
  name: string
  slug: string
  description: string | null
  color: string
  niche: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ProjectBrain = {
  id: string
  project_id: string
  brain_score: number
  current_version_label: string
  learning_count: number
  knowledge_count: number
  pattern_count: number
  source_count: number
  relationship_count: number
  current_pattern_version_id: string | null
  last_learning_at: string | null
  score_breakdown: Record<string, unknown>
  last_computed_at: string | null
  created_at: string
  updated_at: string
}

export type ProjectWithBrain = Project & {
  project_brains: ProjectBrain | ProjectBrain[] | null
}

export type ProjectSourceRow = {
  id: string
  project_id: string
  name: string
  url: string | null
  source_type: SourceType
  memo: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type KnowledgeEntityRow = {
  id: string
  project_id: string
  name: string
  entity_type: KnowledgeEntityType
  description: string | null
  memo: string | null
  tags: string[]
  importance: number
  created_at: string
  updated_at: string
}

export type KnowledgeRelationshipRow = {
  id: string
  project_id: string
  from_entity_id: string
  to_entity_id: string
  relation_type: string
  memo: string | null
  created_at: string
}

export type LearningArticleRow = {
  id: string
  project_id: string
  title: string
  body: string
  source_url: string | null
  project_source_id: string | null
  memo: string | null
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed'
  analysis_error: string | null
  analyzed_at: string | null
  created_at: string
  updated_at: string
}

export type LearningTagRow = {
  id: string
  learning_article_id: string
  tag: string
  created_at: string
}

export type BrainActivityLogRow = {
  id: string
  project_id: string
  activity_type: BrainActivityType
  entity_id: string | null
  title: string
  summary: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type AgentRunRow = {
  id: string
  project_id: string
  agent_name: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  input_ref: Record<string, unknown>
  output_ref: Record<string, unknown>
  error_message: string | null
  attempt_count: number
  provider: string | null
  model: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type LearningAnalysisRow = {
  id: string
  learning_article_id: string
  project_id: string
  agent_run_id: string | null
  agent_name: string
  provider: string
  model: string
  raw_result: Record<string, unknown>
  confidence: number | null
  prompt_version: string
  created_at: string
}

export type PatternCandidateRow = {
  id: string
  project_id: string
  learning_article_id: string
  learning_analysis_id: string
  category: string
  label: string
  value: Record<string, unknown>
  confidence: number | null
  created_at: string
}

export type PatternVersionRow = {
  id: string
  project_id: string
  version_label: string
  version_number: number
  status: 'draft' | 'active' | 'archived'
  summary: string | null
  learning_count_at_create: number
  agent_run_id: string | null
  raw_result: Record<string, unknown> | null
  confidence: number | null
  created_at: string
  activated_at: string | null
}

export type PatternItemRow = {
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

export type PatternVersionDiffRow = {
  id: string
  project_id: string
  from_version_id: string
  to_version_id: string
  added_patterns: Record<string, unknown>[]
  strengthened_patterns: Record<string, unknown>[]
  weakened_patterns: Record<string, unknown>[]
  removed_patterns: Record<string, unknown>[]
  summary: string | null
  created_at: string
}

type TableDefinition<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        Profile,
        { id: string; display_name?: string | null; avatar_url?: string | null; preferences?: Profile['preferences'] },
        Partial<Omit<Profile, 'id'>>
      >
      workspaces: TableDefinition<
        Workspace,
        { name: string; slug: string; plan?: Workspace['plan']; settings?: Record<string, unknown> },
        Partial<Omit<Workspace, 'id' | 'created_at'>>
      >
      workspace_members: TableDefinition<
        WorkspaceMember,
        { workspace_id: string; user_id: string; role?: WorkspaceRole; invited_at?: string | null },
        Partial<WorkspaceMember>
      >
      projects: TableDefinition<
        Project,
        {
          workspace_id: string
          name: string
          slug: string
          description?: string | null
          color?: string
          niche?: string | null
          metadata?: Record<string, unknown>
        },
        Partial<Omit<Project, 'id' | 'workspace_id' | 'created_at'>>
      >
      project_brains: TableDefinition<
        ProjectBrain,
        { project_id: string } & Partial<Omit<ProjectBrain, 'id' | 'project_id' | 'created_at'>>,
        Partial<Omit<ProjectBrain, 'id' | 'project_id' | 'created_at'>>
      >
      project_sources: TableDefinition<
        ProjectSourceRow,
        {
          project_id: string
          name: string
          url?: string | null
          source_type?: SourceType
          memo?: string | null
          is_active?: boolean
        },
        Partial<Omit<ProjectSourceRow, 'id' | 'project_id' | 'created_at'>>
      >
      knowledge_entities: TableDefinition<
        KnowledgeEntityRow,
        {
          project_id: string
          name: string
          entity_type: KnowledgeEntityType
          description?: string | null
          memo?: string | null
          tags?: string[]
          importance?: number
        },
        Partial<Omit<KnowledgeEntityRow, 'id' | 'project_id' | 'created_at'>>
      >
      knowledge_relationships: TableDefinition<
        KnowledgeRelationshipRow,
        {
          project_id: string
          from_entity_id: string
          to_entity_id: string
          relation_type?: string
          memo?: string | null
        },
        Partial<Omit<KnowledgeRelationshipRow, 'id' | 'project_id' | 'created_at'>>
      >
      learning_articles: TableDefinition<
        LearningArticleRow,
        {
          project_id: string
          title: string
          body: string
          source_url?: string | null
          project_source_id?: string | null
          memo?: string | null
        },
        Partial<Omit<LearningArticleRow, 'id' | 'project_id' | 'created_at'>>
      >
      learning_tags: TableDefinition<
        LearningTagRow,
        { learning_article_id: string; tag: string },
        Partial<Omit<LearningTagRow, 'id' | 'created_at'>>
      >
      brain_activity_logs: TableDefinition<
        BrainActivityLogRow,
        {
          project_id: string
          activity_type: BrainActivityType
          entity_id?: string | null
          title: string
          summary?: string | null
          metadata?: Record<string, unknown>
        },
        Partial<Omit<BrainActivityLogRow, 'id' | 'project_id' | 'created_at'>>
      >
      agent_runs: TableDefinition<
        AgentRunRow,
        {
          project_id: string
          agent_name: string
          status?: AgentRunRow['status']
          input_ref?: Record<string, unknown>
          output_ref?: Record<string, unknown>
          provider?: string | null
          model?: string | null
        },
        Partial<Omit<AgentRunRow, 'id' | 'project_id' | 'created_at'>>
      >
      learning_analyses: TableDefinition<
        LearningAnalysisRow,
        {
          learning_article_id: string
          project_id: string
          agent_name?: string
          provider: string
          model: string
          raw_result: Record<string, unknown>
          confidence?: number | null
          prompt_version?: string
          agent_run_id?: string | null
        },
        Partial<Omit<LearningAnalysisRow, 'id' | 'created_at'>>
      >
      pattern_candidates: TableDefinition<
        PatternCandidateRow,
        {
          project_id: string
          learning_article_id: string
          learning_analysis_id: string
          category: string
          label: string
          value?: Record<string, unknown>
          confidence?: number | null
        },
        Partial<Omit<PatternCandidateRow, 'id' | 'created_at'>>
      >
      pattern_versions: TableDefinition<
        PatternVersionRow,
        {
          project_id: string
          version_label: string
          version_number: number
          status?: PatternVersionRow['status']
          summary?: string | null
          learning_count_at_create?: number
          agent_run_id?: string | null
          raw_result?: Record<string, unknown> | null
          confidence?: number | null
          activated_at?: string | null
        },
        Partial<Omit<PatternVersionRow, 'id' | 'project_id' | 'created_at'>>
      >
      pattern_items: TableDefinition<
        PatternItemRow,
        {
          project_id: string
          pattern_version_id: string
          category: string
          label: string
          description?: string | null
          formula?: string | null
          examples?: string[]
          confidence?: number | null
          occurrence_count?: number
          source_candidate_ids?: string[]
          metadata?: Record<string, unknown>
        },
        Partial<Omit<PatternItemRow, 'id' | 'project_id' | 'pattern_version_id' | 'created_at'>>
      >
      pattern_version_diffs: TableDefinition<
        PatternVersionDiffRow,
        {
          project_id: string
          from_version_id: string
          to_version_id: string
          added_patterns?: Record<string, unknown>[]
          strengthened_patterns?: Record<string, unknown>[]
          weakened_patterns?: Record<string, unknown>[]
          removed_patterns?: Record<string, unknown>[]
          summary?: string | null
        },
        Partial<Omit<PatternVersionDiffRow, 'id' | 'project_id' | 'created_at'>>
      >
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
