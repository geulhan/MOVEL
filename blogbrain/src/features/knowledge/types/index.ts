export const KNOWLEDGE_ENTITY_TYPES = [
  'person',
  'brand',
  'keyword',
  'category',
  'product',
  'event',
] as const

export type KnowledgeEntityType = (typeof KNOWLEDGE_ENTITY_TYPES)[number]

export const KNOWLEDGE_ENTITY_TYPE_LABELS: Record<KnowledgeEntityType, string> = {
  person: 'Person',
  brand: 'Brand',
  keyword: 'Keyword',
  category: 'Category',
  product: 'Product',
  event: 'Event',
}

export const RELATION_TYPES = [
  'related_to',
  'associated_with',
  'mentions',
  'part_of',
] as const

export type RelationType = (typeof RELATION_TYPES)[number]

export type KnowledgeEntity = {
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

export type KnowledgeRelationship = {
  id: string
  project_id: string
  from_entity_id: string
  to_entity_id: string
  relation_type: string
  memo: string | null
  created_at: string
}

export type KnowledgeRelationshipWithEntities = KnowledgeRelationship & {
  from_entity: KnowledgeEntity
  to_entity: KnowledgeEntity
}

export type CreateKnowledgeInput = {
  projectId: string
  name: string
  entityType: KnowledgeEntityType
  description?: string
  memo?: string
  tags?: string[]
  importance?: number
}

export type UpdateKnowledgeInput = {
  entityId: string
  name?: string
  entityType?: KnowledgeEntityType
  description?: string | null
  memo?: string | null
  tags?: string[]
  importance?: number
}

export type CreateRelationshipInput = {
  projectId: string
  fromEntityId: string
  toEntityId: string
  relationType?: string
  memo?: string
}
