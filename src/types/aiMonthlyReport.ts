import type { CenterHealthGrade } from './businessAnalytics'

export type AiReportProviderId = 'rule-based' | 'openai'

export type ReportMetricCard = {
  label: string
  value: string
  hint?: string
}

export type ReportInsightItem = {
  title: string
  detail?: string
}

export type ReportStrengthItem = {
  title: string
  evidence: string
  whyGood: string
}

export type ReportImprovementItem = {
  title: string
  problem: string
  evidence: string
  cause: string
  impact: string
  priority: 'high' | 'medium' | 'low'
}

export type ReportActionItem = {
  priority: number
  title: string
  method: string
  expectedEffect: string
  duration: string
  roi: string
  /** @deprecated method + expectedEffect 조합 */
  detail?: string
}

export type ReportPredictionItem = {
  label: string
  value: string
  confidence: 'high' | 'medium' | 'low'
}

export type AiMonthlyBusinessReport = {
  provider: AiReportProviderId
  periodLabel: string
  nextPeriodLabel: string
  generatedAt: string
  summaryNarrative: string
  summaryMetrics: ReportMetricCard[]
  strengths: ReportStrengthItem[]
  improvements: ReportImprovementItem[]
  actionPlan: ReportActionItem[]
  predictions: ReportPredictionItem[]
  predictedRisk: string
  overallConfidence: 'high' | 'medium' | 'low'
  ceoMessage: string
  dataGaps: string[]
}

export type MonthlyOperationalSignals = {
  newMemberCount: number
  dormantMemberCount: number
  activeMemberCount: number
  expiringMemberCount: number
  renewalTargetCount: number
  attendanceRate: number
  completedSessions: number
  scheduledSessions: number
  newLeadCount: number
  convertedLeadCount: number
}

export type AiMonthlyReportComparisons = {
  revenueDelta: number | null
  profitDelta: number | null
  renewalRateDelta: number | null
  newMemberDelta: number | null
  renewalMemberDelta: number | null
  attendanceDelta: number | null
  priorRenewalRate: number | null
  priorNewMemberCount: number | null
  priorAttendanceRate: number | null
}

export type AiMonthlyReportContext = {
  periodLabel: string
  nextPeriodLabel: string
  generatedAt: string
  cashRevenue: number
  cashRevenueNew: number
  cashRevenueRenewal: number
  cashRevenueNewMemberCount: number
  cashRevenueRenewalMemberCount: number
  totalRecognized: number
  netProfit: number
  totalRefundRisk: number
  healthGrade: CenterHealthGrade
  healthScore: number
  renewalRate: number
  averageSessionPrice: number
  ownerDependencyPercent: number
  operational: MonthlyOperationalSignals
  priorOperational: MonthlyOperationalSignals | null
  comparisons: AiMonthlyReportComparisons
  monthlyReport: Array<{
    cashRevenue: number
    cashRevenueNew: number
    cashRevenueRenewal: number
    recognizedRevenue: number
    netProfit: number
    renewalRate: number
  }>
}

export interface AiMonthlyReportProvider {
  readonly id: AiReportProviderId
  generate(context: AiMonthlyReportContext): Promise<AiMonthlyBusinessReport>
}
