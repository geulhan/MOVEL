import { useMemo } from 'react'
import { formatDate } from '../../api/members'
import { generateAiMonthlyBusinessReportSync } from '../../lib/aiMonthlyReport'
import { cardClass } from '../../styles/theme'
import type { BusinessAnalyticsSnapshot } from '../../types/businessAnalytics'
import type {
  AiMonthlyBusinessReport,
  ReportActionItem,
  ReportImprovementItem,
  ReportMetricCard,
  ReportPredictionItem,
  ReportStrengthItem,
} from '../../types/aiMonthlyReport'

function confidenceLabel(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return '신뢰도 높음'
  if (level === 'medium') return '신뢰도 보통'
  return '신뢰도 낮음'
}

function priorityLabel(priority: ReportImprovementItem['priority']): string {
  if (priority === 'high') return '높음'
  if (priority === 'medium') return '보통'
  return '낮음'
}

function MetricCard({ metric }: { metric: ReportMetricCard }) {
  return (
    <div className={`${cardClass} min-w-0 p-4`}>
      <p className="text-xs font-medium text-muted">{metric.label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-charcoal">{metric.value}</p>
      {metric.hint && <p className="mt-1 text-xs text-muted">{metric.hint}</p>}
    </div>
  )
}

function StrengthCard({ item }: { item: ReportStrengthItem }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-semibold text-emerald-900">{item.title}</p>
      <p className="mt-2 text-xs font-medium text-emerald-800/70">근거</p>
      <p className="mt-0.5 text-sm leading-relaxed text-emerald-900/85">{item.evidence}</p>
      <p className="mt-2 text-xs font-medium text-emerald-800/70">왜 좋은지</p>
      <p className="mt-0.5 text-sm leading-relaxed text-emerald-900/85">{item.whyGood}</p>
    </div>
  )
}

function ImprovementCard({ item }: { item: ReportImprovementItem }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-900">{item.title}</p>
        <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
          우선순위 {priorityLabel(item.priority)}
        </span>
      </div>
      <p className="mt-2 text-xs font-medium text-amber-800/70">문제</p>
      <p className="mt-0.5 text-sm text-amber-900/85">{item.problem}</p>
      <p className="mt-2 text-xs font-medium text-amber-800/70">근거 데이터</p>
      <p className="mt-0.5 text-sm text-amber-900/85">{item.evidence}</p>
      <p className="mt-2 text-xs font-medium text-amber-800/70">발생 원인</p>
      <p className="mt-0.5 text-sm text-amber-900/85">{item.cause}</p>
      <p className="mt-2 text-xs font-medium text-amber-800/70">영향</p>
      <p className="mt-0.5 text-sm text-amber-900/85">{item.impact}</p>
    </div>
  )
}

function ActionCard({ item }: { item: ReportActionItem }) {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-sm font-semibold text-sky-900">
        {item.priority}. {item.title}
      </p>
      <p className="mt-2 text-xs font-medium text-sky-800/70">실행 방법</p>
      <p className="mt-0.5 text-sm leading-relaxed text-sky-900/85">{item.method}</p>
      <p className="mt-2 text-xs font-medium text-sky-800/70">예상 효과</p>
      <p className="mt-0.5 text-sm text-sky-900/85">{item.expectedEffect}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-sky-800/75">
        <span>소요 {item.duration}</span>
        <span>ROI {item.roi}</span>
      </div>
    </div>
  )
}

function PredictionCard({ item }: { item: ReportPredictionItem }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-xs font-medium text-violet-700/80">{item.label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-violet-950">{item.value}</p>
      <p className="mt-1 text-[11px] text-violet-700/70">{confidenceLabel(item.confidence)}</p>
    </div>
  )
}

type Props = {
  data: BusinessAnalyticsSnapshot
}

export function BusinessMonthlyReportPanel({ data }: Props) {
  const report = useMemo<AiMonthlyBusinessReport | null>(() => {
    if (!data.operational) return null
    return generateAiMonthlyBusinessReportSync(
      data,
      data.operational,
      data.priorOperational,
    )
  }, [data])

  if (!report) {
    return (
      <section className={`${cardClass} p-6 text-sm text-muted`}>
        MotionHub AI 리포트를 생성하는 중입니다…
      </section>
    )
  }

  const providerLabel =
    report.provider === 'openai'
      ? 'MotionHub AI'
      : 'MotionHub AI (규칙 기반)'

  return (
    <div className="space-y-6">
      <section className={`${cardClass} space-y-4 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
                MotionHub AI
              </p>
              <span className="rounded-full bg-charcoal/8 px-2 py-0.5 text-[10px] font-semibold text-charcoal/70">
                {providerLabel}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-charcoal">{report.periodLabel}</h2>
            <p className="mt-1 text-xs text-muted">
              피트니스 센터 경영 AI 어드바이저 · 객관적 데이터 분석
            </p>
          </div>
          <p className="text-xs text-muted">생성 {formatDate(report.generatedAt)}</p>
        </div>

        <h3 className="text-sm font-semibold text-charcoal">📊 이번 달 요약</h3>
        <p className="rounded-xl border border-gold/25 bg-cream/50 px-4 py-3 text-sm leading-relaxed text-charcoal">
          {report.summaryNarrative}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {report.summaryMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        {report.dataGaps.length > 0 && (
          <div className="rounded-xl border border-charcoal/12 bg-charcoal/4 px-4 py-3 text-xs leading-relaxed text-muted">
            <p className="font-semibold text-charcoal/80">추가 데이터 필요</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {report.dataGaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`${cardClass} space-y-3 p-5`}>
          <h3 className="text-sm font-semibold text-charcoal">👍 잘한 점</h3>
          <p className="text-xs text-muted">근거가 있는 성과만 표시합니다 (최대 3개)</p>
          <div className="space-y-3">
            {report.strengths.map((item) => (
              <StrengthCard key={item.title} item={item} />
            ))}
          </div>
        </div>

        <div className={`${cardClass} space-y-3 p-5`}>
          <h3 className="text-sm font-semibold text-charcoal">⚠ 개선이 필요한 부분</h3>
          <p className="text-xs text-muted">현금흐름 → 수익 → 재등록 순 우선 (최대 5개)</p>
          <div className="space-y-3">
            {report.improvements.map((item) => (
              <ImprovementCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className={`${cardClass} space-y-3 p-5`}>
        <h3 className="text-sm font-semibold text-charcoal">
          🎯 {report.nextPeriodLabel} Action Plan
        </h3>
        <p className="text-xs text-muted">우선순위 순 실행 항목</p>
        <div className="grid gap-3 lg:grid-cols-2">
          {report.actionPlan.map((item) => (
            <ActionCard key={`${item.priority}-${item.title}`} item={item} />
          ))}
        </div>
      </section>

      <section className={`${cardClass} space-y-3 p-5`}>
        <h3 className="text-sm font-semibold text-charcoal">📈 다음 달 예측</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {report.predictions.map((item) => (
            <PredictionCard key={item.label} item={item} />
          ))}
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 sm:col-span-2 xl:col-span-4">
            <p className="text-xs font-medium text-red-700/80">예상 위험</p>
            <p className="mt-1 text-sm leading-relaxed text-red-900/90">{report.predictedRisk}</p>
            <p className="mt-2 text-[11px] text-red-700/70">
              전체 신뢰도: {confidenceLabel(report.overallConfidence)}
            </p>
          </div>
        </div>
      </section>

      <section className={`${cardClass} border-gold/30 bg-gradient-to-br from-cream/60 to-white p-5`}>
        <h3 className="text-sm font-semibold text-charcoal">CEO에게 한마디</h3>
        <p className="mt-2 text-sm leading-relaxed text-charcoal">{report.ceoMessage}</p>
      </section>
    </div>
  )
}
