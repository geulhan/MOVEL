import { supabase } from '@/lib/supabase/client'
import type { LearningAnalysisRecord, AgentRunRecord, PatternCandidateRecord } from '@/ai/types'

export type RunLearningAgentResponse = {
  success: boolean
  agentRunId: string
  analysisId: string
  confidence: number
}

export async function invokeLearningAgent(
  learningArticleId: string,
): Promise<RunLearningAgentResponse> {
  const { data, error } = await supabase.functions.invoke('run-learning-agent', {
    body: { learningArticleId },
  })

  if (error) throw error
  if (data?.error) throw new Error(String(data.error))

  return data as RunLearningAgentResponse
}

export async function fetchLearningAnalyses(
  projectId: string,
): Promise<LearningAnalysisRecord[]> {
  const { data, error } = await supabase
    .from('learning_analyses')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data as LearningAnalysisRecord[]
}

export async function fetchLearningAnalysis(
  articleId: string,
): Promise<LearningAnalysisRecord | null> {
  const { data, error } = await supabase
    .from('learning_analyses')
    .select('*')
    .eq('learning_article_id', articleId)
    .maybeSingle()

  if (error) throw error
  return data as LearningAnalysisRecord | null
}

export async function fetchAgentRuns(projectId: string): Promise<AgentRunRecord[]> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data as AgentRunRecord[]
}

export async function fetchPatternCandidates(
  projectId: string,
): Promise<PatternCandidateRecord[]> {
  const { data, error } = await supabase
    .from('pattern_candidates')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data as PatternCandidateRecord[]
}

export const agentKeys = {
  analyses: (projectId: string) => ['agents', projectId, 'analyses'] as const,
  analysis: (articleId: string) => ['agents', 'analysis', articleId] as const,
  runs: (projectId: string) => ['agents', projectId, 'runs'] as const,
  patterns: (projectId: string) => ['agents', projectId, 'patterns'] as const,
}
