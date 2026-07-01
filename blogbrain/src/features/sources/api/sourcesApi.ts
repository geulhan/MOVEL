import { supabase } from '@/lib/supabase/client'
import type {
  CreateSourceInput,
  ProjectSource,
  UpdateSourceInput,
} from '@/features/sources/types'

export async function fetchSources(projectId: string): Promise<ProjectSource[]> {
  const { data, error } = await supabase
    .from('project_sources')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createSource(input: CreateSourceInput): Promise<ProjectSource> {
  const { data, error } = await supabase
    .from('project_sources')
    .insert({
      project_id: input.projectId,
      name: input.name,
      url: input.url ?? null,
      source_type: input.sourceType,
      memo: input.memo ?? null,
      is_active: input.isActive ?? true,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateSource(input: UpdateSourceInput): Promise<ProjectSource> {
  const { data, error } = await supabase
    .from('project_sources')
    .update({
      name: input.name,
      url: input.url,
      source_type: input.sourceType,
      memo: input.memo,
      is_active: input.isActive,
    })
    .eq('id', input.sourceId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteSource(sourceId: string): Promise<void> {
  const { error } = await supabase.from('project_sources').delete().eq('id', sourceId)
  if (error) throw error
}

export const sourceKeys = {
  all: (projectId: string) => ['sources', projectId] as const,
}
