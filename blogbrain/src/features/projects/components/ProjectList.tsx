import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useProject } from '@/features/projects/hooks/useProjectContext'
import { Button } from '@/components/ui/button'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const PROJECT_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6']

export function ProjectList() {
  const { projects, setActiveProjectSlug, createProject, deleteProject, isMutating } = useProject()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])

  async function handleCreate() {
    if (!name.trim()) return
    await createProject({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    })
    setName('')
    setDescription('')
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">블로그 Brain 프로젝트를 관리합니다.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          새 프로젝트
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardHeader>
            <CardTitle>프로젝트가 없습니다</CardTitle>
            <CardDescription>첫 Brain 프로젝트를 만들어 시작하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpen(true)}>프로젝트 생성</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer border-border/60 shadow-none transition-colors hover:bg-accent/30"
              onClick={() => setActiveProjectSlug(project.slug)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <CardTitle className="text-base">{project.name}</CardTitle>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <span className="text-xs text-muted-foreground">/{project.slug}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation()
                    if (window.confirm(`"${project.name}" 프로젝트를 삭제할까요?`)) {
                      void deleteProject(project.id)
                    }
                  }}
                >
                  삭제
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 프로젝트</DialogTitle>
            <DialogDescription>프로젝트 생성 시 Brain이 자동으로 만들어집니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">이름</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="연예 블로그"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">설명</Label>
              <Input
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="카리나, 아이돌 패션 콘텐츠"
              />
            </div>
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 ${
                      color === option ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: option }}
                    onClick={() => setColor(option)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={isMutating || !name.trim()}>
              {isMutating ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
