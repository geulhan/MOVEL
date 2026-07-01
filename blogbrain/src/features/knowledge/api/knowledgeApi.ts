import { supabase } from '@/lib/supabase/client'
import type {
  CreateKnowledgeInput,
  CreateRelationshipInput,
  KnowledgeEntity,
  KnowledgeRelationship,
  KnowledgeRelationshipWithEntities,
  UpdateKnowledgeInput,
} from '@/features/knowledge/types'

export async function fetchKnowledgeEntities(projectId: string): Promise<KnowledgeEntity[]> {
  const { data, error } = await supabase
    .from('knowledge_entities')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchKnowledgeEntity(entityId: string): Promise<KnowledgeEntity | null> {
  const { data, error } = await supabase
    .from('knowledge_entities')
    .select('*')
    .eq('id', entityId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createKnowledgeEntity(input: CreateKnowledgeInput): Promise<KnowledgeEntity> {
  const { data, error } = await supabase
    .from('knowledge_entities')
    .insert({
      project_id: input.projectId,
      name: input.name,
      entity_type: input.entityType,
      description: input.description ?? null,
      memo: input.memo ?? null,
      tags: input.tags ?? [],
      importance: input.importance ?? 3,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateKnowledgeEntity(input: UpdateKnowledgeInput): Promise<KnowledgeEntity> {
  const { data, error } = await supabase
    .from('knowledge_entities')
    .update({
      name: input.name,
      entity_type: input.entityType,
      description: input.description,
      memo: input.memo,
      tags: input.tags,
      importance: input.importance,
    })
    .eq('id', input.entityId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteKnowledgeEntity(entityId: string): Promise<void> {
  const { error } = await supabase.from('knowledge_entities').delete().eq('id', entityId)
  if (error) throw error
}

export async function fetchRelationships(
  projectId: string,
): Promise<KnowledgeRelationshipWithEntities[]> {
  const { data: relationships, error } = await supabase
    .from('knowledge_relationships')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!relationships || relationships.length === 0) return []

  const entityIds = [
    ...new Set(relationships.flatMap((row) => [row.from_entity_id, row.to_entity_id])),
  ]

  const { data: entities, error: entitiesError } = await supabase
    .from('knowledge_entities')
    .select('*')
    .in('id', entityIds)

  if (entitiesError) throw entitiesError

  const entityMap = new Map((entities ?? []).map((entity) => [entity.id, entity]))

  return relationships.flatMap((row) => {
    const fromEntity = entityMap.get(row.from_entity_id)
    const toEntity = entityMap.get(row.to_entity_id)
    if (!fromEntity || !toEntity) return []

    return [{
      ...row,
      from_entity: fromEntity,
      to_entity: toEntity,
    }]
  })
}

export async function fetchEntityRelationships(
  entityId: string,
): Promise<KnowledgeRelationshipWithEntities[]> {
  const { data: relationships, error } = await supabase
    .from('knowledge_relationships')
    .select('*')
    .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`)
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!relationships || relationships.length === 0) return []

  const entityIds = [
    ...new Set(relationships.flatMap((row) => [row.from_entity_id, row.to_entity_id])),
  ]

  const { data: entities, error: entitiesError } = await supabase
    .from('knowledge_entities')
    .select('*')
    .in('id', entityIds)

  if (entitiesError) throw entitiesError

  const entityMap = new Map((entities ?? []).map((entity) => [entity.id, entity]))

  return relationships.flatMap((row) => {
    const fromEntity = entityMap.get(row.from_entity_id)
    const toEntity = entityMap.get(row.to_entity_id)
    if (!fromEntity || !toEntity) return []

    return [{
      ...row,
      from_entity: fromEntity,
      to_entity: toEntity,
    }]
  })
}

export async function createRelationship(
  input: CreateRelationshipInput,
): Promise<KnowledgeRelationship> {
  const { data, error } = await supabase
    .from('knowledge_relationships')
    .insert({
      project_id: input.projectId,
      from_entity_id: input.fromEntityId,
      to_entity_id: input.toEntityId,
      relation_type: input.relationType ?? 'related_to',
      memo: input.memo ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteRelationship(relationshipId: string): Promise<void> {
  const { error } = await supabase
    .from('knowledge_relationships')
    .delete()
    .eq('id', relationshipId)

  if (error) throw error
}

export const knowledgeKeys = {
  all: (projectId: string) => ['knowledge', projectId] as const,
  entity: (entityId: string) => ['knowledge', 'entity', entityId] as const,
  relationships: (projectId: string) => ['knowledge', projectId, 'relationships'] as const,
  entityRelationships: (entityId: string) => ['knowledge', 'entity', entityId, 'relationships'] as const,
}
