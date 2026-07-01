import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { PATTERN_CATEGORIES } from '@/ai/schemas/patternAnalysisSchema'
import { useProject } from '@/features/projects/hooks/useProjectContext'
import { useWorkspace } from '@/features/workspace/hooks/useWorkspaceContext'
import { usePatterns } from '@/features/patterns/hooks/usePatterns'
import type { PatternItem } from '@/features/patterns/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

function PatternItemCard({ item }: { item: PatternItem }) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
          {item.confidence != null && (
            <Badge variant="secondary">{(item.confidence * 100).toFixed(0)}%</Badge>
          )}
        </div>
        {item.formula && (
          <CardDescription className="font-mono text-xs">{item.formula}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {item.description && (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        )}
        {item.examples.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Examples</p>
            {item.examples.slice(0, 3).map((example) => (
              <p key={example} className="text-xs">· {example}</p>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Occurrence: {item.occurrence_count}
        </p>
      </CardContent>
    </Card>
  )
}

export function PatternManager() {
  const { activeProject } = useProject()
  const { activeWorkspace } = useWorkspace()
  const {
    versions,
    activeVersion,
    selectedVersion,
    setSelectedVersionId,
    items,
    diff,
    loading,
    averageConfidence,
    runPatternAgent,
    isRunning,
  } = usePatterns(activeProject?.id, activeWorkspace?.id)

  const [activeCategory, setActiveCategory] = useState<string>('title')

  const filteredItems = useMemo(
    () => items.filter((item) => item.category === activeCategory),
    [items, activeCategory],
  )

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
        title="Patterns"
        description="Learning Agent 결과를 종합해 블로그 공식을 학습합니다."
        action={
          <Button disabled={isRunning} onClick={() => void runPatternAgent()}>
            <Sparkles className="h-4 w-4" />
            {isRunning ? 'Pattern Agent 실행 중...' : 'Run Pattern Agent'}
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {activeVersion && (
            <Badge variant="default">Active: {activeVersion.version_label}</Badge>
          )}
          {selectedVersion && (
            <Badge variant="outline">{items.length} patterns</Badge>
          )}
          {averageConfidence > 0 && (
            <Badge variant="secondary">
              Avg confidence {(averageConfidence * 100).toFixed(0)}%
            </Badge>
          )}
        </div>

        {versions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Version</span>
            <Select
              value={selectedVersion?.id ?? ''}
              onChange={(event) => setSelectedVersionId(event.target.value)}
              className="w-32"
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.version_label} ({version.status})
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {selectedVersion?.summary && (
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Version Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{selectedVersion.summary}</p>
          </CardContent>
        </Card>
      )}

      {diff && (
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pattern Diff</CardTitle>
            <CardDescription>이전 버전 대비 변화</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Added</p>
              <p className="text-lg font-semibold">{diff.added_patterns.length}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Strengthened</p>
              <p className="text-lg font-semibold">{diff.strengthened_patterns.length}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Weakened</p>
              <p className="text-lg font-semibold">{diff.weakened_patterns.length}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Removed</p>
              <p className="text-lg font-semibold">{diff.removed_patterns.length}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {PATTERN_CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant={activeCategory === cat.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
            <span className="ml-1 text-xs opacity-70">
              ({items.filter((i) => i.category === cat.key).length})
            </span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : versions.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardHeader>
            <CardTitle>Pattern Database가 비어 있습니다</CardTitle>
            <CardDescription>
              Learning Agent로 글을 분석한 뒤 Pattern Agent를 실행하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void runPatternAgent()} disabled={isRunning}>
              Run Pattern Agent
            </Button>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardHeader>
            <CardTitle>이 카테고리에 패턴이 없습니다</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <PatternItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
