import { supabase } from '@/lib/supabase/client'
import type { BrainActivityLog, BrainMemorySnapshot } from '@/features/brain/types'
import type { ProjectBrain } from '@/types/database'

export async function fetchProjectBrain(projectId: string): Promise<ProjectBrain | null> {
  const { data, error } = await supabase
    .from('project_brains')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchBrainActivity(
  projectId: string,
  limit = 20,
): Promise<BrainActivityLog[]> {
  const { data, error } = await supabase
    .from('brain_activity_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function fetchBrainMemory(projectId: string): Promise<BrainMemorySnapshot> {
  const [learningResult, knowledgeResult, sourcesResult, activityResult] = await Promise.all([
    supabase
      .from('learning_articles')
      .select('id, title, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('knowledge_entities')
      .select('id, name, entity_type, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('project_sources')
      .select('id, name, source_type, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(5),
    fetchBrainActivity(projectId, 10),
  ])

  if (learningResult.error) throw learningResult.error
  if (knowledgeResult.error) throw knowledgeResult.error
  if (sourcesResult.error) throw sourcesResult.error

  return {
    recentLearning: learningResult.data ?? [],
    recentKnowledge: (knowledgeResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      entity_type: item.entity_type,
      created_at: item.created_at,
    })),
    recentSources: (sourcesResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      source_type: item.source_type,
      created_at: item.created_at,
    })),
    recentActivity: activityResult,
  }
}

export const brainKeys = {
  brain: (projectId: string) => ['brain', projectId] as const,
  memory: (projectId: string) => ['brain', projectId, 'memory'] as const,
  activity: (projectId: string) => ['brain', projectId, 'activity'] as const,
}
