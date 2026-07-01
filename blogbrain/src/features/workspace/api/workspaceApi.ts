import { supabase } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import type { Workspace } from '@/types/database'

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('로그인이 필요합니다.')

  const baseSlug = slugify(name) || 'workspace'
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({ name, slug })
    .select('*')
    .single()

  if (workspaceError) throw workspaceError

  const { error: memberError } = await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) throw memberError

  return workspace
}

export async function ensureDefaultWorkspace(email: string | undefined): Promise<Workspace> {
  const existing = await fetchWorkspaces()
  if (existing.length > 0) {
    return existing[0]
  }

  const fallbackName = email?.split('@')[0] ?? 'My'
  return createWorkspace(`${fallbackName}'s Workspace`)
}

export const workspaceKeys = {
  all: ['workspaces'] as const,
}
