import { formatCurrency } from '../../api/members'
import type {
  AiMonthlyBusinessReport,
  AiMonthlyReportContext,
  AiMonthlyReportProvider,
  ReportActionItem,
  ReportImprovementItem,
  ReportPredictionItem,
  ReportStrengthItem,
} from '../../types/aiMonthlyReport'
import type { CenterHealthGrade } from '../../types/businessAnalytics'
import { buildMotionHubAiPayload, detectDataGaps } from './buildPayload'

type ScoredStrength = ReportStrengthItem & { score: number }
type ScoredImprovement = ReportImprovementItem & { score: number }

function gradeFromScore(score: number): CenterHealthGrade {
  if (score >= 92) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 78) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

function pickTop<T extends { score: number }>(items: T[], limit: number): T[] {
  return [...items].sort((a, b) => b.score - a.score).slice(0, limit)
}

function overallConfidence(ctx: AiMonthlyReportContext): 'high' | 'medium' | 'low' {
  const gaps = detectDataGaps(ctx)
  if (gaps.length >= 3 || ctx.monthlyReport.length < 2) return 'low'
  if (gaps.length >= 1 || ctx.cashRevenue === 0) return 'medium'
  return 'high'
}

function buildSummaryNarrative(ctx: AiMonthlyReportContext): string {
  const lines: string[] = []
  const renewalShare =
    ctx.cashRevenue > 0
      ? Math.round((ctx.cashRevenueRenewal / ctx.cashRevenue) * 100)
      : 0

  lines.push(
    `${ctx.periodLabel} 현금매출 ${formatCurrency(ctx.cashRevenue)}, 순이익 ${formatCurrency(ctx.netProfit)}입니다.`,
  )

  if (ctx.operational.newMemberCount > 0) {
    const delta =
      ctx.comparisons.newMemberDelta != null
        ? ` (전월 ${ctx.comparisons.newMemberDelta >= 0 ? '+' : ''}${ctx.comparisons.newMemberDelta}명)`
        : ''
    lines.push(
      `신규 등록 ${ctx.operational.newMemberCount}명${delta}, 재등록 결제 ${ctx.cashRevenueRenewalMemberCount}명(매출 비중 ${renewalShare}%)입니다.`,
    )
  } else {
    lines.push(
      `신규 유입이 없고 재등록 결제는 ${ctx.cashRevenueRenewalMemberCount}명(비중 ${renewalShare}%)입니다.`,
    )
  }

  if (ctx.netProfit < 0) {
    lines.push(
      `비용 대비 수익이 부족해 현금흐름·비용 구조 점검이 우선입니다.`,
    )
  } else if ((ctx.comparisons.profitDelta ?? 0) > 0) {
    lines.push(`순이익은 전월 대비 ${formatCurrency(ctx.comparisons.profitDelta ?? 0)} 개선되었습니다.`)
  }

  if (ctx.operational.attendanceRate < 75) {
    lines.push(
      `PT 출석률 ${ctx.operational.attendanceRate}%로 참여도가 낮아 이탈·환불 위험이 있습니다.`,
    )
  }

  if (ctx.totalRefundRisk >= 5_000_000) {
    lines.push(
      `환불 가능 추정 ${formatCurrency(ctx.totalRefundRisk)}으로 리스크 관리가 필요합니다.`,
    )
  }

  return lines.slice(0, 5).join(' ')
}

function buildStrengthCandidates(ctx: AiMonthlyReportContext): ScoredStrength[] {
  const items: ScoredStrength[] = []

  if (ctx.operational.newMemberCount > 0) {
    const evidence = `신규 등록 ${ctx.operational.newMemberCount}명${
      ctx.comparisons.newMemberDelta != null
        ? `, 전월 대비 ${ctx.comparisons.newMemberDelta >= 0 ? '+' : ''}${ctx.comparisons.newMemberDelta}명`
        : ''
    }`
    items.push({
      score: 70 + (ctx.comparisons.newMemberDelta ?? 0) * 8,
      title: '신규 회원 유입',
      evidence,
      whyGood:
        (ctx.comparisons.newMemberDelta ?? 0) > 0
          ? '신규 유입이 늘면 단기 현금흐름이 개선됩니다. 전월 대비 증가이므로 유입 채널이 작동 중입니다.'
          : '신규 유입이 있어 성장 동력이 유지되고 있습니다. 다만 전월 대비 증가 여부는 추가 확인이 필요합니다.',
    })
  }

  if (ctx.cashRevenueRenewal > 0 && ctx.renewalRate >= 70) {
    items.push({
      score: 68 + ctx.renewalRate,
      title: '재등록 매출 유지',
      evidence: `재등록 결제 ${ctx.cashRevenueRenewalMemberCount}명 · ${formatCurrency(ctx.cashRevenueRenewal)} · 재등록률 ${ctx.renewalRate}%`,
      whyGood:
        '재등록 매출은 예측 가능한 현금흐름의 핵심입니다. 재등록률이 70% 이상이면 이탈 비용 대비 안정적입니다.',
    })
  }

  if (ctx.netProfit > 0) {
    items.push({
      score: 58 + Math.min(ctx.healthScore / 10, 10),
      title: '흑자 운영',
      evidence: `순이익 ${formatCurrency(ctx.netProfit)} · 건강도 ${ctx.healthGrade}(${ctx.healthScore}점)`,
      whyGood:
        '흑자는 고정비·인건비를 감당할 여력이 있다는 뜻입니다. 이익을 재투자·비상금으로 쌓을 수 있습니다.',
    })
  }

  if (ctx.operational.attendanceRate >= 80 && ctx.operational.scheduledSessions > 0) {
    items.push({
      score: 60 + ctx.operational.attendanceRate / 5,
      title: '출석률 양호',
      evidence: `PT 출석률 ${ctx.operational.attendanceRate}% (${ctx.operational.completedSessions}/${ctx.operational.scheduledSessions}회)`,
      whyGood:
        '높은 출석률은 만족도·재등록 가능성과 연결됩니다. 노쇼·환불 리스크를 낮춥니다.',
    })
  }

  if (ctx.totalRefundRisk < 2_000_000 && ctx.cashRevenue > 0) {
    items.push({
      score: 65,
      title: '환불 리스크 낮음',
      evidence: `환불 가능 추정 ${formatCurrency(ctx.totalRefundRisk)}`,
      whyGood:
        '환불 부담이 낮으면 현금흐름 예측이 쉽습니다. 운영 안정성에 유리합니다.',
    })
  }

  if (
    ctx.comparisons.revenueDelta != null &&
    ctx.comparisons.revenueDelta > 0
  ) {
    items.push({
      score: 55,
      title: '인식매출 성장',
      evidence: `전월 대비 인식매출 +${formatCurrency(ctx.comparisons.revenueDelta)}`,
      whyGood:
        '매출 성장은 규모 확대·수익성 개선의 기반입니다. 성장 원인(신규 vs 재등록)을 유지해야 합니다.',
    })
  }

  if (ctx.operational.convertedLeadCount > 0) {
    items.push({
      score: 52,
      title: '상담 전환 성과',
      evidence: `상담 ${ctx.operational.newLeadCount}건 중 ${ctx.operational.convertedLeadCount}건 회원 전환`,
      whyGood:
        '상담→회원 전환은 마케팅 비용 대비 효율적인 유입입니다. 전환 프로세스를 표준화할 가치가 있습니다.',
    })
  }

  return items
}

function buildImprovementCandidates(ctx: AiMonthlyReportContext): ScoredImprovement[] {
  const items: ScoredImprovement[] = []

  if (ctx.netProfit < 0) {
    items.push({
      score: 95,
      title: '비용 대비 수익 부족',
      problem: '순이익이 마이너스입니다.',
      evidence: `순이익 ${formatCurrency(ctx.netProfit)}, 인식매출 ${formatCurrency(ctx.totalRecognized)}`,
      cause: '고정비·트레이너 정산 대비 매출·마진이 부족할 가능성이 큽니다.',
      impact: '현금흐름 악화, 운영 지속성 위험 (우선순위 1: Cash Flow)',
      priority: 'high',
    })
  }

  if (ctx.renewalRate < 75) {
    items.push({
      score: 90 - ctx.renewalRate,
      title: '재등록 부족',
      problem: '재등록률이 목표(75%) 미만입니다.',
      evidence: `재등록률 ${ctx.renewalRate}% · 재등록 대상 ${ctx.operational.renewalTargetCount}명 · 재등록 결제 ${ctx.cashRevenueRenewalMemberCount}명`,
      cause: '만료 전 상담·알림·패키지 제안이 체계적으로 실행되지 않았을 수 있습니다.',
      impact: '다음 달 현금매출 20~40% 감소 가능 (우선순위 3: Retention)',
      priority: 'high',
    })
  }

  if (ctx.operational.expiringMemberCount >= 3) {
    items.push({
      score: 70 + ctx.operational.expiringMemberCount,
      title: '만료 예정 회원 증가',
      problem: '30일 이내 만료 회원이 많습니다.',
      evidence: `만료 예정 ${ctx.operational.expiringMemberCount}명`,
      cause: '재등록 상담 시점이 늦었거나 만료 전 알림이 부족합니다.',
      impact: '단기 현금흐름·재등록률 동시 하락 위험',
      priority: 'high',
    })
  }

  if (ctx.operational.attendanceRate < 75 && ctx.operational.scheduledSessions > 0) {
    items.push({
      score: 75,
      title: '출석률 낮음',
      problem: 'PT 출석률이 75% 미만입니다.',
      evidence: `출석률 ${ctx.operational.attendanceRate}% (${ctx.operational.completedSessions}/${ctx.operational.scheduledSessions}회)`,
      cause: '일정 미조율·동기 저하·노쇼 관리 미흡 가능성',
      impact: '만족도·재등록률 하락, 환불 요청 증가 가능',
      priority: 'medium',
    })
  }

  if (
    ctx.comparisons.attendanceDelta != null &&
    ctx.comparisons.attendanceDelta < -5
  ) {
    items.push({
      score: 80,
      title: '출석률 감소 추세',
      problem: '전월 대비 출석률이 하락했습니다.',
      evidence: `전월 대비 ${ctx.comparisons.attendanceDelta}%p · 현재 ${ctx.operational.attendanceRate}%`,
      cause: '회원 참여도 저하 또는 일정 운영 변화',
      impact: '이탈·환불 신호로 해석할 수 있음',
      priority: 'medium',
    })
  }

  if (ctx.totalRefundRisk >= 3_000_000) {
    items.push({
      score: 58,
      title: '환불 리스크',
      problem: '환불 가능 금액이 큽니다.',
      evidence: `환불 가능 추정 ${formatCurrency(ctx.totalRefundRisk)}`,
      cause: '잔여 회차·만료 임박 회원 비중이 높음',
      impact: '예상치 못한 현금 유출, 순이익 악화',
      priority: 'medium',
    })
  }

  if (ctx.operational.dormantMemberCount > 0) {
    items.push({
      score: 60 + ctx.operational.dormantMemberCount,
      title: '휴면 회원 누적',
      problem: '휴면 회원이 방치되고 있습니다.',
      evidence: `휴면 회원 ${ctx.operational.dormantMemberCount}명`,
      cause: '복귀 캠페인·리마인더 미실행',
      impact: '잠재 매출·재등록 기회 손실',
      priority: 'low',
    })
  }

  if (ctx.operational.newLeadCount < 3) {
    items.push({
      score: 65,
      title: '상담·유입 부족',
      problem: '신규 상담 등록이 적습니다.',
      evidence: `이번 달 신규 상담 ${ctx.operational.newLeadCount}건`,
      cause: '마케팅·체험·소개 채널 활동 부족',
      impact: '중장기 성장 동력 약화 (우선순위 4: Growth)',
      priority: 'medium',
    })
  }

  if (ctx.cashRevenueNew > ctx.cashRevenueRenewal && ctx.cashRevenue > 0) {
    items.push({
      score: 55,
      title: '재등록 매출 비중 낮음',
      problem: '매출이 신규에 치우쳐 있습니다.',
      evidence: `신규 ${formatCurrency(ctx.cashRevenueNew)} · 재등록 ${formatCurrency(ctx.cashRevenueRenewal)}`,
      cause: '재등록 프로세스·만료 관리 미흡',
      impact: '신규 유입 둔화 시 매출 급감 위험',
      priority: 'medium',
    })
  }

  if (ctx.ownerDependencyPercent > 45) {
    items.push({
      score: 50,
      title: '대표 매출 의존',
      problem: '대표 트레이너 매출 비중이 높습니다.',
      evidence: `대표 트레이너 매출 비중 ${ctx.ownerDependencyPercent}%`,
      cause: '강사 분산·위임·자동화 부족',
      impact: '대표 부재 시 매출·운영 리스크 (우선순위 5: Automation)',
      priority: 'low',
    })
  }

  if (items.length === 0) {
    items.push({
      score: 1,
      title: '즉시 개선 항목 없음',
      problem: '현재 지표상 긴급 이슈가 없습니다.',
      evidence: `건강도 ${ctx.healthGrade}, 순이익 ${formatCurrency(ctx.netProfit)}`,
      cause: '—',
      impact: '다음 달 목표·자동화 강화에 집중 가능',
      priority: 'low',
    })
  }

  return items
}

function buildActionPlan(ctx: AiMonthlyReportContext): ReportActionItem[] {
  const actions: ReportActionItem[] = []
  const avgTicket = ctx.averageSessionPrice > 0 ? ctx.averageSessionPrice * 10 : 500_000

  if (ctx.operational.expiringMemberCount > 0) {
    actions.push({
      priority: 1,
      title: '만료 예정 회원 재등록 상담',
      method: `${ctx.operational.expiringMemberCount}명에게 만료 14일 전 1:1 상담·패키지 제안. 경영관리 → 메시지 발송에서 알림톡 발송.`,
      expectedEffect: `재등록 1건당 약 ${formatCurrency(avgTicket)} 현금 유입`,
      duration: '이번 주 2~3시간',
      roi: '높음 — 기존 회원 전환이 신규 대비 비용 효율적',
    })
  }

  if (ctx.netProfit < 0) {
    actions.push({
      priority: 2,
      title: '비용·정산 구조 점검',
      method: '경영 설정에서 고정비·트레이너 정산율 재확인. 불필요 지출 1건 이상 축소.',
      expectedEffect: '순이익 개선, 현금흐름 안정',
      duration: '1~2시간',
      roi: '매우 높음 — 즉시 현금 보존',
    })
  }

  if (ctx.renewalRate < 80 || ctx.operational.renewalTargetCount > 0) {
    actions.push({
      priority: 3,
      title: 'PT 재등록 알림·상담',
      method: '잔여 3회 이하·만료 30일 이내 회원에게 재등록 알림톡 발송 후 상담 예약.',
      expectedEffect: `재등록률 5~10%p 개선 시 매출 ${formatCurrency(Math.round(ctx.cashRevenue * 0.1))} 이상 가능`,
      duration: '주 1~2시간',
      roi: '높음',
    })
  }

  if (ctx.operational.dormantMemberCount > 0) {
    actions.push({
      priority: 4,
      title: '휴면 회원 복귀 캠페인',
      method: `휴면 ${ctx.operational.dormantMemberCount}명에게 복귀 혜택·체험 수업 안내 메시지 발송.`,
      expectedEffect: '복귀 1~2명 시 단기 매출·출석률 회복',
      duration: '30분',
      roi: '중간',
    })
  }

  if (ctx.operational.attendanceRate < 80 && ctx.operational.scheduledSessions > 0) {
    actions.push({
      priority: 5,
      title: '출석률 개선',
      method: '노쇼·미예약 회원에게 일정 재조율 문자. 주 2회 방문 목표 안내.',
      expectedEffect: '출석률 5%p 상승 시 재등록·만족도 개선',
      duration: '주 30분',
      roi: '중간~높음',
    })
  }

  if (ctx.operational.newLeadCount < 5) {
    actions.push({
      priority: 6,
      title: '신규 상담·체험 유입',
      method: '지인 소개·인스타·네이버 예약·체험 PT 프로모션 1건 이상 등록(상담·리드 메뉴).',
      expectedEffect: '월 신규 1~2명 추가 유입',
      duration: '2~4시간',
      roi: '중간 (장기 성장)',
    })
  }

  return actions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map((action, index) => ({
      ...action,
      priority: index + 1,
      detail: `${action.method} ${action.expectedEffect}`,
    }))
}

function buildPredictions(ctx: AiMonthlyReportContext): {
  items: ReportPredictionItem[]
  risk: string
} {
  const rows = ctx.monthlyReport
  let growthRate = 0.03
  if (rows.length >= 2) {
    const prev = rows[rows.length - 2].cashRevenue
    const curr = rows[rows.length - 1].cashRevenue
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
  const predictedRenewal = Math.round(
    predictedRevenue * Math.min(renewalRatio + (ctx.renewalRate < 75 ? -0.05 : 0.02), 0.75),
  )

  const risks: string[] = []
  if (ctx.renewalRate < 75) risks.push('재등록률 저하로 매출 감소')
  if (ctx.operational.expiringMemberCount >= 3) risks.push('만료 회원 이탈')
  if (ctx.netProfit < 0) risks.push('적자 지속')
  if (ctx.totalRefundRisk >= 3_000_000) risks.push('환불 요청 증가')
  if (risks.length === 0) risks.push('현 추세 유지 시 큰 위험 신호 없음')

  return {
    risk: risks.join(' · '),
    items: [
      {
        label: '예상 매출',
        value: formatCurrency(predictedRevenue),
        confidence: rows.length >= 3 ? 'medium' : 'low',
      },
      {
        label: '예상 신규 회원',
        value: `${predictedNewMembers}명`,
        confidence: ctx.operational.newMemberCount > 0 ? 'medium' : 'low',
      },
      {
        label: '예상 재등록',
        value: formatCurrency(predictedRenewal),
        confidence: ctx.cashRevenueRenewal > 0 ? 'medium' : 'low',
      },
    ],
  }
}

function buildCeoMessage(
  ctx: AiMonthlyReportContext,
  improvements: ReportImprovementItem[],
): string {
  const top = improvements[0]
  if (ctx.netProfit < 0) {
    return `이번 달 가장 시급한 것은 현금흐름입니다. 순이익 ${formatCurrency(ctx.netProfit)} 상태이므로, 신규 영업보다 만료·재등록·비용 점검에 이번 주 시간을 쓰세요.`
  }
  if (ctx.renewalRate < 75 && ctx.operational.expiringMemberCount > 0) {
    return `다음 달 매출의 ${Math.round((ctx.cashRevenueRenewal / Math.max(ctx.cashRevenue, 1)) * 100)}%가 재등록에 달려 있습니다. 만료 예정 ${ctx.operational.expiringMemberCount}명 상담이 이번 달 최우선입니다.`
  }
  if (top && top.priority === 'high') {
    return `${top.title}이 가장 중요합니다. ${top.impact} — 이번 달 Action Plan 1번부터 실행하세요.`
  }
  if (ctx.operational.newMemberCount === 0) {
    return '신규 유입이 없습니다. 재등록만으로는 성장이 어렵습니다. 이번 주 상담·체험 1건 이상 등록하세요.'
  }
  return `현재 건강도 ${ctx.healthGrade}입니다. 잘한 점을 유지하면서 Action Plan 상위 항목을 이번 달 안에 완료하세요.`
}

export class RuleBasedAiMonthlyReportProvider implements AiMonthlyReportProvider {
  readonly id = 'rule-based' as const

  generateSync(context: AiMonthlyReportContext): AiMonthlyBusinessReport {
    const payload = buildMotionHubAiPayload(context)
    const strengths = pickTop(buildStrengthCandidates(context), 3)
    const improvements = pickTop(buildImprovementCandidates(context), 5)
    const { items: predictions, risk } = buildPredictions(context)
    const confidence = overallConfidence(context)

    if (strengths.length === 0) {
      strengths.push({
        score: 0,
        title: '분석 가능 데이터 부족',
        evidence: '이번 달 유의미한 긍정 지표가 없습니다.',
        whyGood: '데이터가 쌓이면 다음 달부터 근거 있는 분석이 가능합니다.',
      })
    }

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
          hint: `첫 결제 ${context.cashRevenueNewMemberCount}명 · ${formatCurrency(context.cashRevenueNew)}`,
        },
        {
          label: '재등록',
          value: `${context.cashRevenueRenewalMemberCount}명`,
          hint: `${formatCurrency(context.cashRevenueRenewal)} · 재등록률 ${context.renewalRate}%`,
        },
        {
          label: '순이익',
          value: formatCurrency(context.netProfit),
          hint: `환불 리스크 ${formatCurrency(context.totalRefundRisk)}`,
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
      predictions,
      predictedRisk: risk,
      overallConfidence: confidence,
      ceoMessage: buildCeoMessage(context, improvements),
      dataGaps: payload.dataGaps,
    }
  }

  async generate(context: AiMonthlyReportContext): Promise<AiMonthlyBusinessReport> {
    return this.generateSync(context)
  }
}

export { gradeFromScore }
