export type AgentName =
  | 'learning_agent'
  | 'trend_agent'
  | 'pattern_agent'
  | 'writer_agent'
  | 'seo_agent'
  | 'visual_agent'
  | 'analytics_agent'

export type AgentRunStatus = 'queued' | 'running' | 'completed' | 'failed'

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type AIProviderName = 'openai' | 'claude' | 'gemini' | 'openrouter'

export type AIMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIAnalyzeRequest = {
  messages: AIMessage[]
  jsonMode?: boolean
  temperature?: number
  maxTokens?: number
}

export type AIAnalyzeResponse = {
  content: string
  model: string
  provider: AIProviderName
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export type AIGenerateRequest = {
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
}

export type AIGenerateResponse = {
  content: string
  model: string
  provider: AIProviderName
}

export type LearningAgentInput = {
  title: string
  body: string
  sourceUrl?: string | null
  memo?: string | null
}

export type AgentRunRecord = {
  id: string
  project_id: string
  agent_name: string
  status: AgentRunStatus
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

export type LearningAnalysisRecord = {
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

export type PatternCandidateRecord = {
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

export const PROMPT_VERSION = '1.0'
export const MAX_AGENT_RETRIES = 3
