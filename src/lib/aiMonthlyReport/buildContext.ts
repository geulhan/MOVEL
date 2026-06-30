import type { BusinessAnalyticsSnapshot } from '../../types/businessAnalytics'
import type {
  AiMonthlyReportComparisons,
  AiMonthlyReportContext,
  MonthlyOperationalSignals,
} from '../../types/aiMonthlyReport'

function nextPeriodLabel(year: number, month: number): string {
  const d = new Date(year, month, 1)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
}

function findCurrentMonthRow(snapshot: BusinessAnalyticsSnapshot) {
  return (
    snapshot.monthlyReport.find(
      (row) =>
        row.year === snapshot.period.year && row.month === snapshot.period.month,
    ) ?? null
  )
}

function buildComparisons(
  snapshot: BusinessAnalyticsSnapshot,
  operational: MonthlyOperationalSignals,
  priorOperational: MonthlyOperationalSignals | null,
): AiMonthlyReportComparisons {
  const rows = snapshot.monthlyReport
  const currentIndex = rows.findIndex(
    (row) =>
      row.year === snapshot.period.year && row.month === snapshot.period.month,
  )
  const currentRow = findCurrentMonthRow(snapshot)
  const previousRow = currentIndex > 0 ? rows[currentIndex - 1] : null

  return {
    revenueDelta:
      previousRow != null
        ? snapshot.totalRecognized - previousRow.recognizedRevenue
        : null,
    profitDelta:
      previousRow != null ? snapshot.netProfit - previousRow.netProfit : null,
    renewalRateDelta:
      previousRow != null && currentRow != null
        ? currentRow.renewalRate - previousRow.renewalRate
        : null,
    newMemberDelta:
      priorOperational != null
        ? operational.newMemberCount - priorOperational.newMemberCount
        : null,
    attendanceDelta:
      priorOperational != null
        ? operational.attendanceRate - priorOperational.attendanceRate
        : null,
    priorRenewalRate: previousRow?.renewalRate ?? null,
    priorNewMemberCount: priorOperational?.newMemberCount ?? null,
    priorAttendanceRate: priorOperational?.attendanceRate ?? null,
  }
}

export function buildAiMonthlyReportContext(
  snapshot: BusinessAnalyticsSnapshot,
  operational: MonthlyOperationalSignals,
  priorOperational: MonthlyOperationalSignals | null,
): AiMonthlyReportContext {
  const currentRow = findCurrentMonthRow(snapshot)

  return {
    periodLabel: snapshot.period.label,
    nextPeriodLabel: nextPeriodLabel(snapshot.period.year, snapshot.period.month),
    generatedAt: new Date().toISOString(),
    cashRevenue: snapshot.cashRevenue,
    cashRevenueNew: snapshot.cashRevenueNew,
    cashRevenueRenewal: snapshot.cashRevenueRenewal,
    totalRecognized: snapshot.totalRecognized,
    netProfit: snapshot.netProfit,
    totalRefundRisk: snapshot.totalRefundRisk,
    healthGrade: snapshot.healthGrade,
    healthScore: snapshot.healthScore,
    renewalRate: currentRow?.renewalRate ?? 100,
    averageSessionPrice: snapshot.averageSessionPrice,
    ownerDependencyPercent: snapshot.ownerDependencyPercent,
    operational,
    priorOperational,
    comparisons: buildComparisons(snapshot, operational, priorOperational),
    monthlyReport: snapshot.monthlyReport.map((row) => ({
      cashRevenue: row.cashRevenue,
      cashRevenueNew: row.cashRevenueNew,
      cashRevenueRenewal: row.cashRevenueRenewal,
      recognizedRevenue: row.recognizedRevenue,
      netProfit: row.netProfit,
      renewalRate: row.renewalRate,
    })),
  }
}
