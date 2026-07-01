export const SOURCE_TYPES = [
  'news',
  'sns',
  'youtube',
  'brand',
  'magazine',
  'community',
  'custom',
] as const

export type SourceType = (typeof SOURCE_TYPES)[number]

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  news: 'News',
  sns: 'SNS',
  youtube: 'Youtube',
  brand: 'Brand',
  magazine: 'Magazine',
  community: 'Community',
  custom: 'Custom',
}

export type ProjectSource = {
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

export type CreateSourceInput = {
  projectId: string
  name: string
  url?: string
  sourceType: SourceType
  memo?: string
  isActive?: boolean
}

export type UpdateSourceInput = {
  sourceId: string
  name?: string
  url?: string | null
  sourceType?: SourceType
  memo?: string | null
  isActive?: boolean
}
