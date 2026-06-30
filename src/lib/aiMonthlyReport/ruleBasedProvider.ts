import { formatCurrency } from '../../api/members'
import type {
  AiMonthlyBusinessReport,
  AiMonthlyReportContext,
  AiMonthlyReportProvider,
  ReportActionItem,
  ReportInsightItem,
  ReportPredictionItem,
} from '../../types/aiMonthlyReport'
import type { CenterHealthGrade } from '../../types/businessAnalytics'

type ScoredInsight = ReportInsightItem & { score: number }

function gradeFromScore(score: number): CenterHealthGrade {
  if (score >= 92) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 78) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

function pickTopInsights(items: ScoredInsight[], limit: number): ReportInsightItem[] {
  return [...items]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ title, detail }) => ({ title, detail }))
}

function buildSummaryNarrative(ctx: AiMonthlyReportContext): string {
  const sentences: string[] = []
  const renewalShare =
    ctx.cashRevenue > 0
      ? Math.round((ctx.cashRevenueRenewal / ctx.cashRevenue) * 100)
      : 0

  if (ctx.operational.newMemberCount > 0) {
    if ((ctx.comparisons.newMemberDelta ?? 0) > 0) {
      sentences.push(
        `이번 달은 신규 회원 ${ctx.operational.newMemberCount}명으로 유입이 전월보다 늘었습니다`,
      )
    } else {
      sentences.push(
        `이번 달 신규 회원은 ${ctx.operational.newMemberCount}명입니다`,
      )
    }
  } else {
    sentences.push('이번 달 신규 회원 유입이 거의 없습니다')
  }

  if (renewalShare < 40 || ctx.renewalRate < 70) {
    sentences.push(
      '재등록 매출·재등록률이 낮아 다음 달 매출 감소 가능성이 있습니다',
    )
  } else if (renewalShare >= 55 && ctx.renewalRate >= 80) {
    sentences.push('재등록 흐름이 안정적이라 매출 기반이 유지되고 있습니다')
  }

  if (ctx.operational.attendanceRate < 75) {
    sentences.push(
      `PT 출석률이 ${ctx.operational.attendanceRate}%로 낮아 회원 관리가 필요합니다`,
    )
  } else if ((ctx.comparisons.attendanceDelta ?? 0) > 5) {
    sentences.push('출석률이 개선되며 회원 참여도가 좋아지고 있습니다')
  }

  if (ctx.netProfit < 0) {
    sentences.push('비용 대비 수익이 부족해 구조 점검이 필요합니다')
  } else if ((ctx.comparisons.profitDelta ?? 0) > 0) {
    sentences.push('순이익은 전월 대비 개선되는 흐름입니다')
  }

  if (ctx.totalRefundRisk >= 5_000_000) {
    sentences.push(
      `환불 가능 추정 ${formatCurrency(ctx.totalRefundRisk)}으로 리스크 관리가 중요합니다`,
    )
  }

  return `${sentences.slice(0, 3).join('. ')}.`
}

function buildStrengthCandidates(ctx: AiMonthlyReportContext): ScoredInsight[] {
  const items: ScoredInsight[] = []

  if (ctx.operational.newMemberCount > 0) {
    items.push({
      score: 70 + (ctx.comparisons.newMemberDelta ?? 0) * 8,
      title: '신규 회원 증가',
      detail: `이번 달 신규 등록 ${ctx.operational.newMemberCount}명${
        ctx.comparisons.newMemberDelta != null && ctx.comparisons.newMemberDelta > 0
          ? ` (전월 +${ctx.comparisons.newMemberDelta}명)`
          : ''
      }`,
    })
  }

  if (ctx.cashRevenueRenewal > 0 && ctx.cashRevenueRenewal >= ctx.cashRevenueNew) {
    items.push({
      score: 68 + ctx.renewalRate,
      title: '재등록 매출 견조',
      detail: `재등록 결제 ${formatCurrency(ctx.cashRevenueRenewal)} · 재등록률 ${ctx.renewalRate}%`,
    })
  }

  if (ctx.totalRefundRisk < 2_000_000) {
    items.push({
      score: 65,
      title: '환불 리스크 낮음',
      detail: `환불 가능 추정 ${formatCurrency(ctx.totalRefundRisk)}`,
    })
  }

  if (ctx.operational.attendanceRate >= 80) {
    items.push({
      score: 60 + ctx.operational.attendanceRate / 5,
      title: '출석률 양호',
      detail: `PT 출석률 ${ctx.operational.attendanceRate}% (${ctx.operational.completedSessions}/${ctx.operational.scheduledSessions}회)`,
    })
  }

  if (ctx.netProfit > 0) {
    items.push({
      score: 58 + Math.min(ctx.healthScore / 10, 10),
      title: '흑자 운영',
      detail: `순이익 ${formatCurrency(ctx.netProfit)} · 건강도 ${ctx.healthGrade}`,
    })
  }

  if (
    ctx.comparisons.revenueDelta != null &&
    ctx.comparisons.revenueDelta > 0
  ) {
    items.push({
      score: 55,
      title: '인식매출 성장',
      detail: `전월 대비 +${formatCurrency(ctx.comparisons.revenueDelta)}`,
    })
  }

  if (ctx.operational.convertedLeadCount > 0) {
    items.push({
      score: 52,
      title: '상담 전환 성과',
      detail: `상담 ${ctx.operational.newLeadCount}건 중 ${ctx.operational.convertedLeadCount}건 회원 전환`,
    })
  }

  if (items.length === 0) {
    items.push({
      score: 1,
      title: '운영 데이터 수집 중',
      detail: '다음 달부터 비교 지표가 더 정확해집니다.',
    })
  }

  return items
}

function buildImprovementCandidates(ctx: AiMonthlyReportContext): ScoredInsight[] {
  const items: ScoredInsight[] = []

  if (ctx.renewalRate < 75) {
    items.push({
      score: 90 - ctx.renewalRate,
      title: '재등록 부족',
      detail: `재등록률 ${ctx.renewalRate}% · 재등록 대상 ${ctx.operational.renewalTargetCount}명`,
    })
  }

  if (
    ctx.comparisons.attendanceDelta != null &&
    ctx.comparisons.attendanceDelta < -5
  ) {
    items.push({
      score: 80,
      title: '출석률 감소',
      detail: `전월 대비 ${ctx.comparisons.attendanceDelta}%p · 현재 ${ctx.operational.attendanceRate}%`,
    })
  } else if (ctx.operational.attendanceRate < 75) {
    items.push({
      score: 75,
      title: '출석률 낮음',
      detail: `PT 출석률 ${ctx.operational.attendanceRate}%`,
    })
  }

  if (ctx.operational.expiringMemberCount >= 3) {
    items.push({
      score: 70 + ctx.operational.expiringMemberCount,
      title: '만료 예정 회원 증가',
      detail: `30일 이내 만료 예정 ${ctx.operational.expiringMemberCount}명`,
    })
  }

  if (ctx.operational.newLeadCount < 3) {
    items.push({
      score: 65,
      title: '상담 등록 부족',
      detail: `이번 달 신규 상담 ${ctx.operational.newLeadCount}건`,
    })
  }

  if (ctx.operational.dormantMemberCount > 0) {
    items.push({
      score: 60 + ctx.operational.dormantMemberCount,
      title: '휴면 회원 관리 필요',
      detail: `휴면 회원 ${ctx.operational.dormantMemberCount}명`,
    })
  }

  if (ctx.totalRefundRisk >= 3_000_000) {
    items.push({
      score: 58,
      title: '환불 리스크',
      detail: `환불 가능 추정 ${formatCurrency(ctx.totalRefundRisk)}`,
    })
  }

  if (ctx.cashRevenueNew > ctx.cashRevenueRenewal && ctx.cashRevenue > 0) {
    items.push({
      score: 55,
      title: '재등록 매출 비중 낮음',
      detail: `신규 ${formatCurrency(ctx.cashRevenueNew)} · 재등록 ${formatCurrency(ctx.cashRevenueRenewal)}`,
    })
  }

  if (ctx.ownerDependencyPercent > 45) {
    items.push({
      score: 50,
      title: '대표 매출 의존',
      detail: `대표 트레이너 매출 비중 ${ctx.ownerDependencyPercent}%`,
    })
  }

  if (items.length === 0) {
    items.push({
      score: 1,
      title: '즉시 개선 항목 없음',
      detail: '현재 지표는 안정적입니다. 다음 달 목표만 명확히 하세요.',
    })
  }

  return items
}

function buildActionPlan(ctx: AiMonthlyReportContext): ReportActionItem[] {
  const actions: ReportActionItem[] = []

  if (ctx.operational.expiringMemberCount > 0) {
    actions.push({
      priority: 1,
      title: '만료 예정 회원 상담',
      detail: `${ctx.operational.expiringMemberCount}명에게 재등록 패키지와 일정을 제안하세요.`,
    })
  }

  if (ctx.operational.dormantMemberCount > 0) {
    actions.push({
      priority: 2,
      title: '휴면 회원 리마인더 발송',
      detail: `휴면 ${ctx.operational.dormantMemberCount}명에게 복귀 혜택·체험 수업을 안내하세요.`,
    })
  }

  if (ctx.renewalRate < 80 || ctx.operational.renewalTargetCount > 0) {
    actions.push({
      priority: 3,
      title: 'PT 재등록 상담',
      detail:
        '경영관리 → 메시지 발송 재등록 탭에서 잔여·만료 회원 알림톡을 발송하고 1:1 상담을 잡으세요.',
    })
  }

  if (ctx.operational.newLeadCount < 5) {
    actions.push({
      priority: 4,
      title: '신규 상담·체험 유입 늘리기',
      detail: '지인 소개, 인스타·네이버 예약, 체험 PT 프로모션을 이번 주 안에 1건 이상 등록하세요.',
    })
  }

  if (ctx.operational.attendanceRate < 80) {
    actions.push({
      priority: 5,
      title: '출석률 개선 캠페인',
      detail: '노쇼·미예약 회원에게 일정 재조율 문자를 보내고 주 2회 이상 방문을 유도하세요.',
    })
  }

  actions.push({
    priority: 6,
    title: '후기·추천 요청',
    detail: '만족도 높은 회원 3명에게 후기 요청 및 지인 소개를 부탁하세요.',
  })

  if (ctx.netProfit < 0) {
    actions.push({
      priority: 7,
      title: '비용·정산 점검',
      detail: '경영 설정에서 고정비와 트레이너 정산율을 재확인하고 불필요 지출을 줄이세요.',
    })
  }

  return actions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map((action, index) => ({ ...action, priority: index + 1 }))
}

function buildPredictions(ctx: AiMonthlyReportContext): ReportPredictionItem[] {
  const rows = ctx.monthlyReport
  const revenues = rows.map((row) => row.cashRevenue)
  const newMembersSeries = rows.map((_, index) =>
    index === rows.length - 1 ? ctx.operational.newMemberCount : null,
  )

  let growthRate = 0.03
  if (revenues.length >= 2) {
    const prev = revenues[revenues.length - 2]
    const curr = revenues[revenues.length - 1]
    if (prev > 0) {
      growthRate = Math.min(Math.max((curr - prev) / prev, -0.15), 0.15)
    }
  }

  const predictedRevenue = Math.round(ctx.cashRevenue * (1 + growthRate))
  const predictedNewMembers = Math.max(
    0,
    Math.round(ctx.operational.newMemberCount * (1 + growthRate)),
  )
  const renewalRatio =
    ctx.cashRevenue > 0 ? ctx.cashRevenueRenewal / ctx.cashRevenue : 0.45
  const predictedRenewal = Math.round(predictedRevenue * Math.min(renewalRatio + 0.05, 0.75))

  const scoreTrend =
    (ctx.comparisons.profitDelta ?? 0) > 0
      ? 4
      : (ctx.comparisons.profitDelta ?? 0) < 0
        ? -6
        : 0
  const predictedScore = Math.max(
    0,
    Math.min(100, ctx.healthScore + scoreTrend + (ctx.renewalRate >= 80 ? 2 : -3)),
  )
  const predictedGrade = gradeFromScore(predictedScore)

  return [
    {
      label: '예상 매출',
      value: formatCurrency(predictedRevenue),
      confidence: rows.length >= 3 ? 'medium' : 'low',
    },
    {
      label: '예상 신규 회원',
      value: `${predictedNewMembers}명`,
      confidence: newMembersSeries.filter((v) => v != null).length >= 1 ? 'medium' : 'low',
    },
    {
      label: '예상 재등록',
      value: formatCurrency(predictedRenewal),
      confidence: ctx.cashRevenueRenewal > 0 ? 'medium' : 'low',
    },
    {
      label: '예상 센터 건강도',
      value: `${predictedGrade} (${predictedScore}점)`,
      confidence: 'medium',
    },
  ]
}

export class RuleBasedAiMonthlyReportProvider implements AiMonthlyReportProvider {
  readonly id = 'rule-based' as const

  generateSync(context: AiMonthlyReportContext): AiMonthlyBusinessReport {
    const strengths = pickTopInsights(buildStrengthCandidates(context), 3)
    const improvements = pickTopInsights(buildImprovementCandidates(context), 4)

    return {
      provider: this.id,
      periodLabel: context.periodLabel,
      nextPeriodLabel: context.nextPeriodLabel,
      generatedAt: context.generatedAt,
      summaryNarrative: buildSummaryNarrative(context),
      summaryMetrics: [
        {
          label: '이번 달 매출',
          value: formatCurrency(context.cashRevenue),
          hint: `인식매출 ${formatCurrency(context.totalRecognized)}`,
        },
        {
          label: '신규 회원',
          value: `${context.operational.newMemberCount}명`,
          hint:
            context.comparisons.newMemberDelta != null
              ? `전월 대비 ${context.comparisons.newMemberDelta >= 0 ? '+' : ''}${context.comparisons.newMemberDelta}명`
              : undefined,
        },
        {
          label: '재등록',
          value: formatCurrency(context.cashRevenueRenewal),
          hint: `재등록률 ${context.renewalRate}%`,
        },
        {
          label: '환불 리스크',
          value: formatCurrency(context.totalRefundRisk),
          hint: `순이익 ${formatCurrency(context.netProfit)}`,
        },
        {
          label: '출석률',
          value: `${context.operational.attendanceRate}%`,
          hint: `완료 ${context.operational.completedSessions} / 예정 ${context.operational.scheduledSessions}회`,
        },
      ],
      strengths,
      improvements,
      actionPlan: buildActionPlan(context),
      predictions: buildPredictions(context),
    }
  }

  async generate(context: AiMonthlyReportContext): Promise<AiMonthlyBusinessReport> {
    return this.generateSync(context)
  }
}
