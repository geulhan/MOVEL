import { useState } from 'react'
import { ExternalLink, Plus } from 'lucide-react'
import { useProject } from '@/features/projects/hooks/useProjectContext'
import { useWorkspace } from '@/features/workspace/hooks/useWorkspaceContext'
import { useSources } from '@/features/sources/hooks/useSources'
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPES,
  type ProjectSource,
  type SourceType,
} from '@/features/sources/types'
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

type SourceFormState = {
  name: string
  url: string
  sourceType: SourceType
  memo: string
  isActive: boolean
}

const emptyForm: SourceFormState = {
  name: '',
  url: '',
  sourceType: 'news',
  memo: '',
  isActive: true,
}

export function SourceManager() {
  const { activeProject } = useProject()
  const { activeWorkspace } = useWorkspace()
  const { sources, loading, createSource, updateSource, deleteSource, isMutating } = useSources(
    activeProject?.id,
    activeWorkspace?.id,
  )

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectSource | null>(null)
  const [form, setForm] = useState<SourceFormState>(emptyForm)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(source: ProjectSource) {
    setEditing(source)
    setForm({
      name: source.name,
      url: source.url ?? '',
      sourceType: source.source_type,
      memo: source.memo ?? '',
      isActive: source.is_active,
    })
    setOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) return

    if (editing) {
      await updateSource({
        sourceId: editing.id,
        name: form.name.trim(),
        url: form.url.trim() || null,
        sourceType: form.sourceType,
        memo: form.memo.trim() || null,
        isActive: form.isActive,
      })
    } else {
      await createSource({
        name: form.name.trim(),
        url: form.url.trim() || undefined,
        sourceType: form.sourceType,
        memo: form.memo.trim() || undefined,
        isActive: form.isActive,
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
        title="Sources"
        description="참고 사이트와 채널을 프로젝트 Brain에 등록합니다."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Source 추가
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardHeader>
            <CardTitle>등록된 Source가 없습니다</CardTitle>
            <CardDescription>네이버 연예, Vogue, Instagram 등 참고 채널을 추가하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openCreate}>첫 Source 추가</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sources.map((source) => (
            <Card key={source.id} className="border-border/60 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{source.name}</CardTitle>
                    <CardDescription>{SOURCE_TYPE_LABELS[source.source_type]}</CardDescription>
                  </div>
                  <Badge variant={source.is_active ? 'default' : 'secondary'}>
                    {source.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {source.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {source.memo && <p className="text-sm text-muted-foreground">{source.memo}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(source)}>
                    수정
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(`"${source.name}" Source를 삭제할까요?`)) {
                        void deleteSource(source.id)
                      }
                    }}
                  >
                    삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Source 수정' : 'Source 추가'}</DialogTitle>
            <DialogDescription>프로젝트별 참고 채널을 관리합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source-name">이름</Label>
              <Input
                id="source-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="네이버 연예"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-url">URL</Label>
              <Input
                id="source-url"
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-type">타입</Label>
              <Select
                id="source-type"
                value={form.sourceType}
                onChange={(event) =>
                  setForm({ ...form, sourceType: event.target.value as SourceType })
                }
              >
                {SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {SOURCE_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-memo">메모</Label>
              <Textarea
                id="source-memo"
                value={form.memo}
                onChange={(event) => setForm({ ...form, memo: event.target.value })}
                placeholder="연예 뉴스 모니터링용"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              />
              활성 상태
            </label>
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
