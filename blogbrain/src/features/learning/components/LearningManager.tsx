import { useState } from 'react'
import { Brain, Plus } from 'lucide-react'
import { useProject } from '@/features/projects/hooks/useProjectContext'
import { useWorkspace } from '@/features/workspace/hooks/useWorkspaceContext'
import { useSources } from '@/features/sources/hooks/useSources'
import { useLearning } from '@/features/learning/hooks/useLearning'
import { useLearningAgent, useLearningAnalysis } from '@/features/agents/hooks/useLearningAgent'
import type { AnalysisStatus, LearningArticleWithMeta } from '@/features/learning/types'
import { SOURCE_TYPE_LABELS } from '@/features/sources/types'
import type { LearningAnalysisResult } from '@/ai/schemas/learningAnalysisSchema'
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
import { formatRelativeDate } from '@/lib/utils'

type LearningFormState = {
  title: string
  body: string
  sourceUrl: string
  projectSourceId: string
  memo: string
  tags: string
}

const emptyForm: LearningFormState = {
  title: '',
  body: '',
  sourceUrl: '',
  projectSourceId: '',
  memo: '',
  tags: '',
}

export function LearningManager() {
  const { activeProject } = useProject()
  const { activeWorkspace } = useWorkspace()
  const { sources } = useSources(activeProject?.id, activeWorkspace?.id)
  const { articles, loading, createArticle, deleteArticle, isMutating } = useLearning(
    activeProject?.id,
    activeWorkspace?.id,
  )

  const { runAgent, isRunning: isAgentRunning } = useLearningAgent(
    activeProject?.id,
    activeWorkspace?.id,
  )

  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<LearningFormState>(emptyForm)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)

  async function runAnalysis(articleId: string) {
    setAnalyzingId(articleId)
    try {
      await runAgent(articleId)
    } finally {
      setAnalyzingId(null)
    }
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.body.trim()) return

    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const article = await createArticle({
      title: form.title.trim(),
      body: form.body.trim(),
      sourceUrl: form.sourceUrl.trim() || undefined,
      projectSourceId: form.projectSourceId || null,
      memo: form.memo.trim() || undefined,
      tags,
    })

    setForm(emptyForm)
    setOpen(false)

    void runAnalysis(article.id)
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
        title="Learning"
        description="블로그 글을 저장하면 Learning Agent가 자동으로 분석합니다."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            글 학습
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardHeader>
            <CardTitle>학습한 글이 없습니다</CardTitle>
            <CardDescription>참고 글을 붙여넣어 Brain Memory를 쌓아보세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpen(true)}>첫 글 학습</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <LearningArticleCard
              key={article.id}
              article={article}
              expanded={expandedId === article.id}
              analyzing={analyzingId === article.id || isAgentRunning}
              onToggle={() =>
                setExpandedId((current) => (current === article.id ? null : article.id))
              }
              onAnalyze={() => void runAnalysis(article.id)}
              onDelete={() => {
                if (window.confirm(`"${article.title}" 학습 글을 삭제할까요?`)) {
                  void deleteArticle(article.id)
                }
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>글 학습</DialogTitle>
            <DialogDescription>제목과 본문을 입력하면 Learning DB에 저장됩니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="learning-title">제목</Label>
              <Input
                id="learning-title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="카리나, 인천공항 패션 화제"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="learning-body">본문</Label>
              <Textarea
                id="learning-body"
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                className="min-h-[240px]"
                placeholder="블로그 글 본문을 붙여넣으세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="learning-url">출처 URL</Label>
              <Input
                id="learning-url"
                value={form.sourceUrl}
                onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="learning-source">Source 선택</Label>
              <Select
                id="learning-source"
                value={form.projectSourceId}
                onChange={(event) => setForm({ ...form, projectSourceId: event.target.value })}
              >
                <option value="">선택 안 함</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} ({SOURCE_TYPE_LABELS[source.source_type]})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="learning-memo">메모</Label>
              <Textarea
                id="learning-memo"
                value={form.memo}
                onChange={(event) => setForm({ ...form, memo: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="learning-tags">태그 (쉼표 구분)</Label>
              <Input
                id="learning-tags"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder="연예, 패션"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={isMutating || !form.title.trim() || !form.body.trim()}
            >
              {isMutating ? '저장 중...' : '학습 저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const variants: Record<AnalysisStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    pending: { label: 'Pending', variant: 'outline' },
    processing: { label: 'Analyzing', variant: 'secondary' },
    completed: { label: 'Analyzed', variant: 'default' },
    failed: { label: 'Failed', variant: 'outline' },
  }
  const config = variants[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function AnalysisResultPreview({ articleId }: { articleId: string }) {
  const { data: analysis } = useLearningAnalysis(articleId)

  if (!analysis) return null

  const result = analysis.raw_result as LearningAnalysisResult

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
      <p className="text-sm font-medium">Learning Agent 결과</p>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p><span className="text-muted-foreground">제목 패턴:</span> {result.title_pattern}</p>
        <p><span className="text-muted-foreground">도입 패턴:</span> {result.intro_pattern}</p>
        <p><span className="text-muted-foreground">문체:</span> {result.writing_style}</p>
        <p><span className="text-muted-foreground">카테고리:</span> {result.category}</p>
        <p><span className="text-muted-foreground">Confidence:</span> {(result.confidence * 100).toFixed(0)}%</p>
      </div>
      {result.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {result.keywords.slice(0, 8).map((keyword) => (
            <Badge key={keyword} variant="outline">{keyword}</Badge>
          ))}
        </div>
      )}
      {result.new_patterns.new_expressions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          새 표현: {result.new_patterns.new_expressions.join(', ')}
        </p>
      )}
    </div>
  )
}

function LearningArticleCard({
  article,
  expanded,
  analyzing,
  onToggle,
  onAnalyze,
  onDelete,
}: {
  article: LearningArticleWithMeta
  expanded: boolean
  analyzing: boolean
  onToggle: () => void
  onAnalyze: () => void
  onDelete: () => void
}) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <button type="button" className="text-left" onClick={onToggle}>
            <CardTitle className="text-base">{article.title}</CardTitle>
            <CardDescription>{formatRelativeDate(article.created_at)}</CardDescription>
          </button>
          <div className="flex items-center gap-2">
            <AnalysisStatusBadge status={article.analysis_status} />
            {(article.analysis_status === 'pending' || article.analysis_status === 'failed') && (
              <Button
                variant="outline"
                size="sm"
                disabled={analyzing}
                onClick={onAnalyze}
              >
                <Brain className="h-3.5 w-3.5" />
                {analyzing ? '분석 중...' : '분석'}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
              삭제
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap gap-2">
          {article.project_sources && (
            <Badge variant="secondary">{article.project_sources.name}</Badge>
          )}
          {article.learning_tags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {tag.tag}
            </Badge>
          ))}
        </div>
        {article.source_url && (
          <p className="text-sm text-muted-foreground">{article.source_url}</p>
        )}
        {article.analysis_error && (
          <p className="text-sm text-destructive">{article.analysis_error}</p>
        )}
        {expanded && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{article.body}</p>
            {article.memo && (
              <p className="mt-3 text-sm text-muted-foreground">메모: {article.memo}</p>
            )}
          </div>
        )}
        {article.analysis_status === 'completed' && (
          <AnalysisResultPreview articleId={article.id} />
        )}
      </CardContent>
    </Card>
  )
}
