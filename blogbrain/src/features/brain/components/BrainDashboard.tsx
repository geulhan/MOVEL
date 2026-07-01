import type { ReactNode } from 'react'
import { formatRelativeDate } from '@/lib/utils'
import { resolveBrainDashboardStats } from '@/lib/constants/brainMock'
import { useProject } from '@/features/projects/hooks/useProjectContext'
import { useBrain } from '@/features/brain/hooks/useBrain'
import { useLearningAnalyses, usePatternCandidates } from '@/features/agents/hooks/useLearningAgent'
import { usePatterns } from '@/features/patterns/hooks/usePatterns'
import type { LearningAnalysisResult } from '@/ai/schemas/learningAnalysisSchema'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { KNOWLEDGE_ENTITY_TYPE_LABELS, type KnowledgeEntityType } from '@/features/knowledge/types'
import { SOURCE_TYPE_LABELS, type SourceType } from '@/features/sources/types'

function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-foreground transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tracking-tight">{score}</span>
        <span className="text-xs text-muted-foreground">Brain Score</span>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  )
}

function MemoryList({
  title,
  emptyLabel,
  items,
  renderItem,
}: {
  title: string
  emptyLabel: string
  items: Array<{ id: string }>
  renderItem: (item: { id: string }) => ReactNode
}) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/60 px-3 py-2">
              {renderItem(item)}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function BrainDashboard() {
  const { activeProject, loading: projectLoading } = useProject()
  const { brain, memory, activity, loading: brainLoading } = useBrain(activeProject?.id)
  const { data: analyses = [] } = useLearningAnalyses(activeProject?.id)
  const { data: patternCandidates = [] } = usePatternCandidates(activeProject?.id)
  const {
    activeVersion,
    items: patternItems,
    diff: patternDiff,
    averageConfidence: patternAvgConfidence,
  } = usePatterns(activeProject?.id)

  const loading = projectLoading || brainLoading

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      </div>
    )
  }

  if (!activeProject) {
    return (
      <Card className="border-dashed shadow-none">
        <CardHeader>
          <CardTitle>프로젝트를 선택하세요</CardTitle>
          <CardDescription>Brain Dashboard를 보려면 프로젝트가 필요합니다.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const stats = resolveBrainDashboardStats(brain)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: activeProject.color }}
            />
            <Badge variant="secondary">Sprint 4 · Pattern Intelligence</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{activeProject.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Brain Memory + Pattern Intelligence Engine
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>
            Pattern Version{' '}
            <span className="font-medium text-foreground">
              {activeVersion?.version_label ?? stats.currentVersion}
            </span>
          </div>
          {patternAvgConfidence > 0 && (
            <div className="text-xs">
              Pattern confidence {(patternAvgConfidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="border-border/60 shadow-none">
          <CardHeader className="text-center">
            <CardTitle className="text-base">Brain Score</CardTitle>
            <CardDescription>
              Learning×2 + Knowledge×1 + Relationship×1 + Source×0.5 + Patterns×0.25
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreRing score={stats.brainScore} />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Learning" value={stats.learningCount} hint="학습한 글" />
          <MetricCard label="Knowledge" value={stats.knowledgeCount} hint="축적된 지식" />
          <MetricCard label="Sources" value={stats.sourceCount} hint="등록된 참고 채널" />
          <MetricCard label="Relationships" value={stats.relationshipCount} hint="지식 연결" />
          <MetricCard label="Patterns" value={stats.patternCount} hint="공식 패턴 (active version)" />
          <MetricCard
            label="Last Learning"
            value={stats.lastLearningAt ? formatRelativeDate(stats.lastLearningAt) : '—'}
            hint="마지막 학습"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MemoryList
          title="Recent Learning"
          emptyLabel="아직 학습한 글이 없습니다."
          items={memory?.recentLearning ?? []}
          renderItem={(item) => {
            const learning = memory?.recentLearning.find((row) => row.id === item.id)
            if (!learning) return null
            return (
              <>
                <p className="text-sm font-medium">{learning.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeDate(learning.created_at)}
                </p>
              </>
            )
          }}
        />
        <MemoryList
          title="Recent Knowledge"
          emptyLabel="등록된 Knowledge가 없습니다."
          items={memory?.recentKnowledge ?? []}
          renderItem={(item) => {
            const knowledge = memory?.recentKnowledge.find((row) => row.id === item.id)
            if (!knowledge) return null
            return (
              <>
                <p className="text-sm font-medium">{knowledge.name}</p>
                <p className="text-xs text-muted-foreground">
                  {KNOWLEDGE_ENTITY_TYPE_LABELS[knowledge.entity_type as KnowledgeEntityType]}
                </p>
              </>
            )
          }}
        />
        <MemoryList
          title="Recent Sources"
          emptyLabel="등록된 Source가 없습니다."
          items={memory?.recentSources ?? []}
          renderItem={(item) => {
            const source = memory?.recentSources.find((row) => row.id === item.id)
            if (!source) return null
            return (
              <>
                <p className="text-sm font-medium">{source.name}</p>
                <p className="text-xs text-muted-foreground">
                  {SOURCE_TYPE_LABELS[source.source_type as SourceType]}
                </p>
              </>
            )
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Brain Activity</CardTitle>
            <CardDescription>최근 Brain Memory 변화</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(memory?.recentActivity ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">활동 기록이 없습니다.</p>
            ) : (
              memory?.recentActivity.map((log) => (
                <div key={log.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="text-sm font-medium">{log.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.activity_type.replaceAll('_', ' ')} · {formatRelativeDate(log.created_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Learning Timeline</CardTitle>
            <CardDescription>학습 이력 타임라인</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(memory?.recentLearning ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">타임라인이 비어 있습니다.</p>
            ) : (
              memory?.recentLearning.map((learning, index) => (
                <div key={learning.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-foreground" />
                    {index < (memory?.recentLearning.length ?? 0) - 1 && (
                      <span className="min-h-8 w-px bg-border" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium">{learning.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(learning.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {activity.length > 0 && (
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Activity Feed</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {activity.slice(0, 6).map((log) => (
              <div key={log.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                <span className="font-medium">{log.title}</span>
                <span className="text-muted-foreground"> · {log.summary ?? log.activity_type}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Recent Analysis</CardTitle>
            <CardDescription>Learning Agent 실행 결과</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analyses.length === 0 ? (
              <p className="text-sm text-muted-foreground">아직 분석 결과가 없습니다.</p>
            ) : (
              analyses.slice(0, 5).map((analysis) => {
                const result = analysis.raw_result as LearningAnalysisResult
                return (
                  <div key={analysis.id} className="rounded-lg border border-border/60 px-3 py-2">
                    <p className="text-sm font-medium">{result.title_pattern || 'Analysis'}</p>
                    <p className="text-xs text-muted-foreground">
                      confidence {(analysis.confidence ?? 0) * 100}% · {formatRelativeDate(analysis.created_at)}
                    </p>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Recent Discoveries</CardTitle>
            <CardDescription>Pattern 후보 (Learning Agent)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {patternCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">발견된 패턴 후보가 없습니다.</p>
            ) : (
              patternCandidates.slice(0, 8).map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{candidate.label}</p>
                    <p className="text-xs text-muted-foreground">{candidate.category}</p>
                  </div>
                  {candidate.confidence != null && (
                    <span className="text-xs text-muted-foreground">
                      {(candidate.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Recent Pattern Updates</CardTitle>
            <CardDescription>Pattern Agent가 승격한 공식 패턴</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {patternItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Run Pattern Agent to build your Pattern Database.</p>
            ) : (
              patternItems.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.category}
                    {item.confidence != null ? ` · ${(item.confidence * 100).toFixed(0)}%` : ''}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">New Patterns Discovered</CardTitle>
            <CardDescription>최근 버전 diff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!patternDiff ? (
              <p className="text-sm text-muted-foreground">아직 버전 diff가 없습니다.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{patternDiff.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {patternDiff.added_patterns.slice(0, 6).map((p) => (
                    <Badge key={`${p.category}-${p.label}`} variant="outline">
                      + {p.label}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
