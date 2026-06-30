import { useMemo } from 'react'
import { formatDate } from '../../api/members'
import { generateAiMonthlyBusinessReportSync } from '../../lib/aiMonthlyReport'
import { cardClass } from '../../styles/theme'
import type { BusinessAnalyticsSnapshot } from '../../types/businessAnalytics'
import type {
  AiMonthlyBusinessReport,
  ReportActionItem,
  ReportInsightItem,
  ReportMetricCard,
  ReportPredictionItem,
} from '../../types/aiMonthlyReport'

function SectionHeader({
  title,
  subtitle,
  badge,
  badgeClass,
}: {
  title: string
  subtitle?: string
  badge?: string
  badgeClass: string
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
          {badge && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  )
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

function GreenCard({ item }: { item: ReportInsightItem }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-semibold text-emerald-900">{item.title}</p>
      {item.detail && (
        <p className="mt-1 text-sm leading-relaxed text-emerald-900/80">{item.detail}</p>
      )}
    </div>
  )
}

function OrangeCard({ item }: { item: ReportInsightItem }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">{item.title}</p>
      {item.detail && (
        <p className="mt-1 text-sm leading-relaxed text-amber-900/80">{item.detail}</p>
      )}
    </div>
  )
}

function BlueCard({ item }: { item: ReportActionItem }) {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-sm font-semibold text-sky-900">
        {item.priority}. {item.title}
      </p>
      {item.detail && (
        <p className="mt-1 text-sm leading-relaxed text-sky-900/80">{item.detail}</p>
      )}
    </div>
  )
}

function PurpleCard({ item }: { item: ReportPredictionItem }) {
  const confidenceLabel =
    item.confidence === 'high'
      ? '신뢰도 높음'
      : item.confidence === 'medium'
        ? '신뢰도 보통'
        : '신뢰도 낮음'

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-xs font-medium text-violet-700/80">{item.label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-violet-950">{item.value}</p>
      <p className="mt-1 text-[11px] text-violet-700/70">{confidenceLabel}</p>
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
        AI 월간 리포트를 생성하는 중입니다…
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className={`${cardClass} space-y-4 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                AI 월간 경영 리포트
              </p>
              <span className="rounded-full bg-charcoal/8 px-2 py-0.5 text-[10px] font-semibold text-charcoal/70">
                {report.provider === 'rule-based' ? '규칙 기반' : report.provider}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-charcoal">{report.periodLabel}</h2>
          </div>
          <p className="text-xs text-muted">생성 {formatDate(report.generatedAt)}</p>
        </div>

        <SectionHeader
          title="이번 달 요약"
          subtitle="5초 안에 이번 달 상태를 파악할 수 있도록 요약합니다."
          badge="Summary"
          badgeClass="bg-charcoal/8 text-charcoal/70"
        />
        <p className="rounded-xl border border-gold/25 bg-cream/50 px-4 py-3 text-sm leading-relaxed text-charcoal">
          {report.summaryNarrative}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {report.summaryMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`${cardClass} space-y-3 p-5`}>
          <SectionHeader
            title="잘한 점"
            subtitle="Top 3"
            badge="Strength"
            badgeClass="bg-emerald-100 text-emerald-800"
          />
          <div className="space-y-3">
            {report.strengths.map((item) => (
              <GreenCard key={item.title} item={item} />
            ))}
          </div>
        </div>

        <div className={`${cardClass} space-y-3 p-5`}>
          <SectionHeader
            title="개선이 필요한 부분"
            subtitle="우선 확인"
            badge="Focus"
            badgeClass="bg-amber-100 text-amber-800"
          />
          <div className="space-y-3">
            {report.improvements.map((item) => (
              <OrangeCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className={`${cardClass} space-y-3 p-5`}>
        <SectionHeader
          title={`${report.nextPeriodLabel} Action Plan`}
          subtitle="대표가 이번 달 안에 실행할 우선순위 업무"
          badge="Action"
          badgeClass="bg-sky-100 text-sky-800"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {report.actionPlan.map((item) => (
            <BlueCard key={`${item.priority}-${item.title}`} item={item} />
          ))}
        </div>
      </section>

      <section className={`${cardClass} space-y-3 p-5`}>
        <SectionHeader
          title="AI 예측"
          subtitle="현재 추세를 바탕으로 한 다음 달 전망 (규칙 기반)"
          badge="Forecast"
          badgeClass="bg-violet-100 text-violet-800"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {report.predictions.map((item) => (
            <PurpleCard key={item.label} item={item} />
          ))}
        </div>
        <p className="text-xs text-muted">
          OpenAI API 연결 시 동일 카드 구조로 실제 AI 분석 결과가 표시됩니다.
        </p>
      </section>
    </div>
  )
}
