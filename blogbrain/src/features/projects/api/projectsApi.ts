import { supabase } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import type { Project, ProjectBrain, ProjectWithBrain } from '@/types/database'

function normalizeBrain(
  brain: ProjectBrain | ProjectBrain[] | null,
): ProjectBrain | null {
  if (!brain) return null
  return Array.isArray(brain) ? brain[0] ?? null : brain
}

export async function fetchProjects(workspaceId: string): Promise<ProjectWithBrain[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_brains(*)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchProjectBySlug(
  workspaceId: string,
  slug: string,
): Promise<ProjectWithBrain | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_brains(*)')
    .eq('workspace_id', workspaceId)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data
}

export type CreateProjectInput = {
  workspaceId: string
  name: string
  description?: string
  color?: string
  niche?: string
}

export async function createProject(input: CreateProjectInput): Promise<ProjectWithBrain> {
  const baseSlug = slugify(input.name) || 'project'
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`

  const { data, error } = await supabase
    .from('projects')
    .insert({
      workspace_id: input.workspaceId,
      name: input.name,
      slug,
      description: input.description ?? null,
      color: input.color ?? '#6366f1',
      niche: input.niche ?? null,
    })
    .select('*, project_brains(*)')
    .single()

  if (error) throw error
  return data
}

export type UpdateProjectInput = {
  projectId: string
  name?: string
  description?: string | null
  color?: string
  niche?: string | null
}

export async function updateProject(input: UpdateProjectInput): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({
      name: input.name,
      description: input.description,
      color: input.color,
      niche: input.niche,
    })
    .eq('id', input.projectId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) throw error
}

export function getProjectBrain(project: ProjectWithBrain): ProjectBrain | null {
  return normalizeBrain(project.project_brains)
}

export const projectKeys = {
  all: (workspaceId: string) => ['projects', workspaceId] as const,
  detail: (workspaceId: string, slug: string) => ['projects', workspaceId, slug] as const,
}
