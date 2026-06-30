import type { AiMonthlyReportContext } from '../../types/aiMonthlyReport'

export type MotionHubAiPayload = {
  dashboard: {
    periodLabel: string
    nextPeriodLabel: string
    cashRevenue: number
    totalRecognized: number
    netProfit: number
    renewalRate: number
    healthGrade: string
    healthScore: number
    totalRefundRisk: number
    averageSessionPrice: number
    ownerDependencyPercent: number
    comparisons: AiMonthlyReportContext['comparisons']
  }
  members: {
    newMemberCount: number
    activeMemberCount: number
    dormantMemberCount: number
    expiringMemberCount: number
    renewalTargetCount: number
    priorNewMemberCount: number | null
  }
  payments: {
    cashRevenueNew: number
    cashRevenueRenewal: number
    cashRevenueNewMemberCount: number
    cashRevenueRenewalMemberCount: number
  }
  attendance: {
    attendanceRate: number
    completedSessions: number
    scheduledSessions: number
    priorAttendanceRate: number | null
  }
  consults: {
    newLeadCount: number
    convertedLeadCount: number
  }
  expenses: {
    netProfit: number
    totalRefundRisk: number
    profitDelta: number | null
    revenueDelta: number | null
  }
  history: AiMonthlyReportContext['monthlyReport']
  dataGaps: string[]
}

export function detectDataGaps(ctx: AiMonthlyReportContext): string[] {
  const gaps: string[] = []

  if (ctx.monthlyReport.length < 2) {
    gaps.push('전월 비교를 위한 2개월 이상 매출 이력이 필요합니다.')
  }
  if (ctx.cashRevenue === 0) {
    gaps.push('이번 달 결제 데이터가 없어 매출 분석 신뢰도가 낮습니다.')
  }
  if (ctx.operational.scheduledSessions === 0) {
    gaps.push('PT 일정 데이터가 없어 출석률 분석이 불가합니다.')
  }
  if (
    ctx.operational.newLeadCount === 0 &&
    ctx.operational.convertedLeadCount === 0
  ) {
    gaps.push('상담·리드 데이터가 없어 유입 채널 분석이 제한됩니다.')
  }
  if (ctx.priorOperational == null) {
    gaps.push('전월 운영 지표가 없어 증감 비교가 제한됩니다.')
  }

  return gaps
}

export function buildMotionHubAiPayload(ctx: AiMonthlyReportContext): MotionHubAiPayload {
  return {
    dashboard: {
      periodLabel: ctx.periodLabel,
      nextPeriodLabel: ctx.nextPeriodLabel,
      cashRevenue: ctx.cashRevenue,
      totalRecognized: ctx.totalRecognized,
      netProfit: ctx.netProfit,
      renewalRate: ctx.renewalRate,
      healthGrade: ctx.healthGrade,
      healthScore: ctx.healthScore,
      totalRefundRisk: ctx.totalRefundRisk,
      averageSessionPrice: ctx.averageSessionPrice,
      ownerDependencyPercent: ctx.ownerDependencyPercent,
      comparisons: ctx.comparisons,
    },
    members: {
      newMemberCount: ctx.operational.newMemberCount,
      activeMemberCount: ctx.operational.activeMemberCount,
      dormantMemberCount: ctx.operational.dormantMemberCount,
      expiringMemberCount: ctx.operational.expiringMemberCount,
      renewalTargetCount: ctx.operational.renewalTargetCount,
      priorNewMemberCount: ctx.comparisons.priorNewMemberCount,
    },
    payments: {
      cashRevenueNew: ctx.cashRevenueNew,
      cashRevenueRenewal: ctx.cashRevenueRenewal,
      cashRevenueNewMemberCount: ctx.cashRevenueNewMemberCount,
      cashRevenueRenewalMemberCount: ctx.cashRevenueRenewalMemberCount,
    },
    attendance: {
      attendanceRate: ctx.operational.attendanceRate,
      completedSessions: ctx.operational.completedSessions,
      scheduledSessions: ctx.operational.scheduledSessions,
      priorAttendanceRate: ctx.comparisons.priorAttendanceRate,
    },
    consults: {
      newLeadCount: ctx.operational.newLeadCount,
      convertedLeadCount: ctx.operational.convertedLeadCount,
    },
    expenses: {
      netProfit: ctx.netProfit,
      totalRefundRisk: ctx.totalRefundRisk,
      profitDelta: ctx.comparisons.profitDelta,
      revenueDelta: ctx.comparisons.revenueDelta,
    },
    history: ctx.monthlyReport,
    dataGaps: detectDataGaps(ctx),
  }
}
