import { useMemo, useState } from 'react'
import { Link2, Plus } from 'lucide-react'
import { useProject } from '@/features/projects/hooks/useProjectContext'
import { useWorkspace } from '@/features/workspace/hooks/useWorkspaceContext'
import { useEntityRelationships, useKnowledge } from '@/features/knowledge/hooks/useKnowledge'
import {
  KNOWLEDGE_ENTITY_TYPE_LABELS,
  KNOWLEDGE_ENTITY_TYPES,
  type KnowledgeEntity,
  type KnowledgeEntityType,
} from '@/features/knowledge/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type EntityFormState = {
  name: string
  entityType: KnowledgeEntityType
  description: string
  memo: string
  tags: string
  importance: number
}

const emptyEntityForm: EntityFormState = {
  name: '',
  entityType: 'person',
  description: '',
  memo: '',
  tags: '',
  importance: 3,
}

function EntityDetailPanel({
  entity,
  candidates,
  onClose,
  onDelete,
  onAddRelationship,
  onDeleteRelationship,
}: {
  entity: KnowledgeEntity
  candidates: KnowledgeEntity[]
  onClose: () => void
  onDelete: () => void
  onAddRelationship: (toEntityId: string) => Promise<void>
  onDeleteRelationship: (relationshipId: string) => Promise<void>
}) {
  const { data: relationships = [], isLoading } = useEntityRelationships(entity.id)
  const [targetEntityId, setTargetEntityId] = useState('')

  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{entity.name}</CardTitle>
            <CardDescription>{KNOWLEDGE_ENTITY_TYPE_LABELS[entity.entity_type]}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {entity.description && <p className="text-sm">{entity.description}</p>}
        {entity.memo && <p className="text-sm text-muted-foreground">{entity.memo}</p>}
        {entity.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entity.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium">관련 Knowledge</p>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : relationships.length === 0 ? (
            <p className="text-sm text-muted-foreground">연결된 Knowledge가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {relationships.map((relation) => {
                const related =
                  relation.from_entity_id === entity.id ? relation.to_entity : relation.from_entity

                return (
                  <div
                    key={relation.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{related.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {KNOWLEDGE_ENTITY_TYPE_LABELS[related.entity_type]} · {relation.relation_type}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void onDeleteRelationship(relation.id)}
                    >
                      해제
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="relation-target">Knowledge 연결</Label>
          <div className="flex gap-2">
            <Select
              id="relation-target"
              value={targetEntityId}
              onChange={(event) => setTargetEntityId(event.target.value)}
            >
              <option value="">선택...</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({KNOWLEDGE_ENTITY_TYPE_LABELS[candidate.entity_type]})
                </option>
              ))}
            </Select>
            <Button
              variant="outline"
              disabled={!targetEntityId}
              onClick={() => {
                void onAddRelationship(targetEntityId).then(() => setTargetEntityId(''))
              }}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          Knowledge 삭제
        </Button>
      </CardContent>
    </Card>
  )
}

export function KnowledgeManager() {
  const { activeProject } = useProject()
  const { activeWorkspace } = useWorkspace()
  const {
    entities,
    loading,
    createEntity,
    updateEntity,
    deleteEntity,
    createRelationship,
    deleteRelationship,
    isMutating,
  } = useKnowledge(activeProject?.id, activeWorkspace?.id)

  const [filterType, setFilterType] = useState<KnowledgeEntityType | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<KnowledgeEntity | null>(null)
  const [form, setForm] = useState<EntityFormState>(emptyEntityForm)

  const filtered = useMemo(() => {
    if (filterType === 'all') return entities
    return entities.filter((entity) => entity.entity_type === filterType)
  }, [entities, filterType])

  const selected = entities.find((entity) => entity.id === selectedId) ?? null

  function openCreate() {
    setEditing(null)
    setForm(emptyEntityForm)
    setOpen(true)
  }

  function openEdit(entity: KnowledgeEntity) {
    setEditing(entity)
    setForm({
      name: entity.name,
      entityType: entity.entity_type,
      description: entity.description ?? '',
      memo: entity.memo ?? '',
      tags: entity.tags.join(', '),
      importance: entity.importance,
    })
    setOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) return

    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    if (editing) {
      await updateEntity({
        entityId: editing.id,
        name: form.name.trim(),
        entityType: form.entityType,
        description: form.description.trim() || null,
        memo: form.memo.trim() || null,
        tags,
        importance: form.importance,
      })
    } else {
      await createEntity({
        name: form.name.trim(),
        entityType: form.entityType,
        description: form.description.trim() || undefined,
        memo: form.memo.trim() || undefined,
        tags,
        importance: form.importance,
      })
    }

    setOpen(false)
  }

  if (!activeProject) {
    return (
      <Card className="border-dashed shadow-none">
        <CardHeader>
          <CardTitle>프로젝트를 선택하세요</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge"
        description="프로젝트 Brain의 지식 그래프를 구축합니다."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Knowledge 추가
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
        >
          All
        </Button>
        {KNOWLEDGE_ENTITY_TYPES.map((type) => (
          <Button
            key={type}
            variant={filterType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType(type)}
          >
            {KNOWLEDGE_ENTITY_TYPE_LABELS[type]}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20" />)
          ) : filtered.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardHeader>
                <CardTitle>Knowledge가 없습니다</CardTitle>
                <CardDescription>카리나, 샤넬, 공항패션 같은 지식을 추가하세요.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            filtered.map((entity) => (
              <button
                key={entity.id}
                type="button"
                onClick={() => setSelectedId(entity.id)}
                className={cn(
                  'w-full rounded-xl border px-4 py-4 text-left transition-colors',
                  selectedId === entity.id
                    ? 'border-foreground/30 bg-accent/40'
                    : 'border-border/60 hover:bg-accent/20',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{entity.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {KNOWLEDGE_ENTITY_TYPE_LABELS[entity.entity_type]} · 중요도 {entity.importance}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      openEdit(entity)
                    }}
                  >
                    수정
                  </Button>
                </div>
              </button>
            ))
          )}
        </div>

        {selected ? (
          <EntityDetailPanel
            entity={selected}
            candidates={entities.filter((item) => item.id !== selected.id)}
            onClose={() => setSelectedId(null)}
            onDelete={() => {
              if (window.confirm(`"${selected.name}" Knowledge를 삭제할까요?`)) {
                void deleteEntity(selected.id).then(() => setSelectedId(null))
              }
            }}
            onAddRelationship={async (toEntityId) => {
              await createRelationship({
                fromEntityId: selected.id,
                toEntityId,
                relationType: 'related_to',
              })
            }}
            onDeleteRelationship={deleteRelationship}
          />
        ) : (
          <Card className="border-dashed shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Knowledge Graph</CardTitle>
              <CardDescription>항목을 선택하면 관련 Knowledge를 연결할 수 있습니다.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Knowledge 수정' : 'Knowledge 추가'}</DialogTitle>
            <DialogDescription>Person, Brand, Keyword 등 Brain 지식을 등록합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entity-name">이름</Label>
              <Input
                id="entity-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="카리나"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-type">타입</Label>
              <Select
                id="entity-type"
                value={form.entityType}
                onChange={(event) =>
                  setForm({ ...form, entityType: event.target.value as KnowledgeEntityType })
                }
              >
                {KNOWLEDGE_ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {KNOWLEDGE_ENTITY_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-description">설명</Label>
              <Textarea
                id="entity-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-memo">메모</Label>
              <Textarea
                id="entity-memo"
                value={form.memo}
                onChange={(event) => setForm({ ...form, memo: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-tags">태그 (쉼표 구분)</Label>
              <Input
                id="entity-tags"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder="아이돌, 패션"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-importance">중요도 (1~5)</Label>
              <Input
                id="entity-importance"
                type="number"
                min={1}
                max={5}
                value={form.importance}
                onChange={(event) =>
                  setForm({ ...form, importance: Number(event.target.value) || 3 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isMutating || !form.name.trim()}>
              {isMutating ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
