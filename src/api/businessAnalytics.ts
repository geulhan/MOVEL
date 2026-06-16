import { getCurrentCenterId } from '../lib/center'
import {
  centerPassPrepaidBalance,
  countPtSessionsInMonth,
  healthGradeFromScore,
  monthBounds,
  ptPrepaidBalance,
  ptRecognizedByTrainer,
  recognizeCenterPassRevenue,
  recognizePtRevenue,
  type MemberTrainer,
  type PeriodPass,
  type PtPayment,
  type PtSessionLog,
} from '../lib/recognitionRevenue'
import { supabase } from '../lib/supabase'
import type { BusinessAnalyticsSnapshot } from '../types/businessAnalytics'
import {
  fetchBusinessAnalyticsSettings,
  sumFixedCosts,
} from './businessAnalyticsSettings'
import { isRenewalTarget } from '../utils/renewal'
import { normalizeMember } from '../lib/memberNormalize'
import type { Member } from '../types/database'

function periodLabel(year: number, month: number): string {
  return `${year}년 ${month}월`
}

function shiftMonth(year: number, month: number, offset: number): {
  year: number
  month: number
} {
  const d = new Date(year, month - 1 + offset, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

async function loadRecognitionInputs(centerId: string) {
  const [paymentsRes, passesRes, facilityRes, logsRes, membersRes] =
    await Promise.all([
      supabase
        .from('payment_history')
        .select('id, member_id, amount, sessions, paid_at, category')
        .eq('center_id', centerId),
      supabase
        .from('center_passes')
        .select('id, member_id, starts_at, ends_at, amount, status')
        .eq('center_id', centerId),
      supabase
        .from('member_facility_subscriptions')
        .select('id, member_id, starts_at, ends_at, amount, status')
        .eq('center_id', centerId),
      supabase
        .from('session_logs')
        .select('id, member_id, deducted_at, quantity')
        .eq('center_id', centerId),
      supabase
        .from('members')
        .select('*')
        .eq('center_id', centerId),
    ])

  if (paymentsRes.error) throw paymentsRes.error
  if (passesRes.error) throw passesRes.error
  if (facilityRes.error) throw facilityRes.error
  if (logsRes.error) throw logsRes.error
  if (membersRes.error) throw membersRes.error

  const centerPasses: PeriodPass[] = (passesRes.data ?? []).map((p) => ({
    id: p.id,
    startsAt: p.starts_at,
    endsAt: p.ends_at,
    amount: Number(p.amount ?? 0),
    status: p.status,
  }))

  const facilityPasses: PeriodPass[] = (facilityRes.data ?? []).map((p) => ({
    id: p.id,
    startsAt: p.starts_at,
    endsAt: p.ends_at,
    amount: Number(p.amount ?? 0),
    status: p.status,
  }))

  const periodPasses = [...centerPasses, ...facilityPasses]

  const ptPayments: PtPayment[] = (paymentsRes.data ?? [])
    .filter((p) => (p.category ?? 'pt') === 'pt')
    .map((p) => ({
      id: p.id,
      memberId: p.member_id,
      amount: Number(p.amount),
      sessions: Number(p.sessions),
      paidAt: p.paid_at,
    }))

  const sessionLogs: PtSessionLog[] = (logsRes.data ?? []).map((l) => ({
    id: l.id,
    memberId: l.member_id,
    deductedAt: l.deducted_at,
    quantity: Number(l.quantity),
  }))

  const memberTrainers: MemberTrainer[] = (membersRes.data ?? []).map((m) => ({
    memberId: m.id,
    trainerId: m.trainer_id,
  }))

  return {
    payments: paymentsRes.data ?? [],
    periodPasses,
    ptPayments,
    sessionLogs,
    memberTrainers,
    members: (membersRes.data ?? []).map((row) => normalizeMember(row)),
  }
}

function isEligibleForAverageSessionPrice(member: Member): boolean {
  return (
    member.status !== 'terminated' &&
    member.total_sessions > 0 &&
    member.payment_amount > 0 &&
    member.trainer_id != null &&
    String(member.trainer_id).trim() !== ''
  )
}

function computeAverageSessionPrice(
  members: Member[],
  ptPayments: PtPayment[],
): {
  averageSessionPrice: number
  totalPayment: number
  totalSessions: number
  memberCount: number
} {
  const eligibleIds = new Set(
    members.filter(isEligibleForAverageSessionPrice).map((member) => member.id),
  )

  const relevantPayments = ptPayments.filter(
    (payment) =>
      eligibleIds.has(payment.memberId) &&
      payment.sessions > 0 &&
      payment.amount > 0,
  )

  let totalPayment = 0
  let totalSessions = 0
  const countedMembers = new Set<string>()

  if (relevantPayments.length > 0) {
    for (const payment of relevantPayments) {
      totalPayment += payment.amount
      totalSessions += payment.sessions
      countedMembers.add(payment.memberId)
    }
  } else {
    for (const member of members) {
      if (!eligibleIds.has(member.id)) continue
      totalPayment += Number(member.payment_amount)
      totalSessions += Number(member.total_sessions)
      countedMembers.add(member.id)
    }
  }

  const averageSessionPrice =
    totalSessions > 0 ? Math.round(totalPayment / totalSessions) : 0

  return {
    averageSessionPrice,
    totalPayment,
    totalSessions,
    memberCount: countedMembers.size,
  }
}

function cashRevenueForMonth(
  payments: Array<{ amount: number; paid_at: string }>,
  year: number,
  month: number,
): number {
  const { prefix } = monthBounds(year, month)
  return payments
    .filter((p) => String(p.paid_at).startsWith(prefix))
    .reduce((sum, p) => sum + Number(p.amount), 0)
}

function computeHealthScore(input: {
  renewalRate: number
  retentionRate: number
  refundExposureRate: number
  ownerDependencyPercent: number
  fixedCostRatioPercent: number
  ptDependencyPercent: number
}): number {
  const renewalScore = Math.min(100, input.renewalRate)
  const retentionScore = Math.min(100, input.retentionRate)
  const refundScore = Math.max(0, 100 - input.refundExposureRate * 2)
  const ownerScore =
    input.ownerDependencyPercent <= 30
      ? 100
      : Math.max(0, 100 - (input.ownerDependencyPercent - 30) * 1.5)
  const fixedScore =
    input.fixedCostRatioPercent <= 25
      ? 100
      : Math.max(0, 100 - (input.fixedCostRatioPercent - 25) * 2)
  const ptScore =
    input.ptDependencyPercent <= 70
      ? 100
      : Math.max(0, 100 - (input.ptDependencyPercent - 70))

  return Math.round(
    renewalScore * 0.2 +
      retentionScore * 0.2 +
      refundScore * 0.15 +
      ownerScore * 0.2 +
      fixedScore * 0.15 +
      ptScore * 0.1,
  )
}

function buildSnapshotForMonth(
  inputs: Awaited<ReturnType<typeof loadRecognitionInputs>>,
  settings: Awaited<ReturnType<typeof fetchBusinessAnalyticsSettings>>,
  year: number,
  month: number,
): Omit<BusinessAnalyticsSnapshot, 'monthlyReport'> {
  const cashRevenue = cashRevenueForMonth(inputs.payments, year, month)
  const centerPassRecognized = recognizeCenterPassRevenue(
    inputs.periodPasses,
    year,
    month,
  )
  const ptRecognized = recognizePtRevenue(
    inputs.ptPayments,
    inputs.sessionLogs,
    year,
    month,
  )
  const totalRecognized = centerPassRecognized + ptRecognized

  const today = new Date().toISOString().slice(0, 10)
  const centerPassPrepaid = centerPassPrepaidBalance(inputs.periodPasses, today)
  const ptPrepaid = ptPrepaidBalance(inputs.ptPayments, inputs.sessionLogs)
  const totalPrepaid = centerPassPrepaid + ptPrepaid

  const trainerPayroll = Math.round(
    ptRecognized * (settings.trainerSettlementRate / 100),
  )
  const centerPtShare = ptRecognized - trainerPayroll

  const members = inputs.members
  const {
    averageSessionPrice,
    totalPayment: registeredPtTotalAmount,
    totalSessions: registeredPtTotalSessions,
    memberCount: registeredMemberCount,
  } = computeAverageSessionPrice(members, inputs.ptPayments)

  const ownerMemberIds = settings.ownerTrainerId
    ? new Set(
        inputs.memberTrainers
          .filter((m) => m.trainerId === settings.ownerTrainerId)
          .map((m) => m.memberId),
      )
    : new Set<string>()

  const ownerSessions = settings.ownerTrainerId
    ? countPtSessionsInMonth(
        inputs.sessionLogs,
        ownerMemberIds,
        year,
        month,
      )
    : 0
  const ownerPayroll = ownerSessions * averageSessionPrice

  const ownerPtRecognized = settings.ownerTrainerId
    ? ptRecognizedByTrainer(
        inputs.ptPayments,
        inputs.sessionLogs,
        inputs.memberTrainers,
        settings.ownerTrainerId,
        year,
        month,
      )
    : 0

  const fixedCostsTotal = sumFixedCosts(settings.fixedCosts)
  const taxReserve = Math.round(
    totalRecognized * (settings.taxReserveRate / 100),
  )
  const facilityReserve = Math.round(
    totalRecognized * (settings.facilityReserveRate / 100),
  )

  const netProfit =
    totalRecognized -
    trainerPayroll -
    ownerPayroll -
    fixedCostsTotal -
    taxReserve -
    facilityReserve

  const ownerDependencyPercent =
    totalRecognized > 0
      ? Math.round((ownerPtRecognized / totalRecognized) * 100)
      : 0
  const ptDependencyPercent =
    totalRecognized > 0
      ? Math.round((ptRecognized / totalRecognized) * 100)
      : 0
  const fixedCostRatioPercent =
    totalRecognized > 0
      ? Math.round((fixedCostsTotal / totalRecognized) * 100)
      : 0

  const renewalTargets = members.filter((m) => isRenewalTarget(m))
  const activeMembers = members.filter((m) => m.status === 'active').length
  const renewalRate =
    renewalTargets.length > 0
      ? Math.round(
          (renewalTargets.filter((m) => m.status === 'active').length /
            renewalTargets.length) *
            100,
        )
      : 100
  const retentionRate =
    members.length > 0
      ? Math.round((activeMembers / members.length) * 100)
      : 100

  const totalHistoricalPayments = inputs.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  )
  const refundExposureRate =
    totalHistoricalPayments > 0
      ? Math.round((totalPrepaid / totalHistoricalPayments) * 100)
      : 0

  const healthScore = computeHealthScore({
    renewalRate,
    retentionRate,
    refundExposureRate,
    ownerDependencyPercent,
    fixedCostRatioPercent,
    ptDependencyPercent,
  })

  return {
    period: { year, month, label: periodLabel(year, month) },
    cashRevenue,
    centerPassRecognized,
    ptRecognized,
    totalRecognized,
    centerPassPrepaid,
    ptPrepaid,
    totalPrepaid,
    centerPassRefundRisk: centerPassPrepaid,
    ptRefundRisk: ptPrepaid,
    totalRefundRisk: totalPrepaid,
    trainerPayroll,
    centerPtShare,
    averageSessionPrice,
    registeredPtTotalAmount,
    registeredPtTotalSessions,
    registeredMemberCount,
    ownerSessions,
    ownerPayroll,
    fixedCostsTotal,
    taxReserve,
    facilityReserve,
    netProfit,
    ownerDependencyPercent,
    ptDependencyPercent,
    fixedCostRatioPercent,
    healthGrade: healthGradeFromScore(healthScore),
    healthScore,
  }
}

export async function fetchBusinessAnalytics(
  year?: number,
  month?: number,
): Promise<BusinessAnalyticsSnapshot> {
  const now = new Date()
  const targetYear = year ?? now.getFullYear()
  const targetMonth = month ?? now.getMonth() + 1

  const centerId = await getCurrentCenterId()
  const [settings, inputs] = await Promise.all([
    fetchBusinessAnalyticsSettings(),
    loadRecognitionInputs(centerId),
  ])

  const snapshot = buildSnapshotForMonth(
    inputs,
    settings,
    targetYear,
    targetMonth,
  )

  const monthlyReport = []
  for (let offset = -5; offset <= 0; offset += 1) {
    const { year: y, month: m } = shiftMonth(targetYear, targetMonth, offset)
    const monthSnapshot = buildSnapshotForMonth(inputs, settings, y, m)
    const members = inputs.members
    const activeMembers = members.filter((member) => member.status === 'active').length
    const renewalTargets = members.filter((m) => isRenewalTarget(m))
    const renewalRate =
      renewalTargets.length > 0
        ? Math.round(
            (renewalTargets.filter((m) => m.status === 'active').length /
              renewalTargets.length) *
              100,
          )
        : 100
    const totalHistoricalPayments = inputs.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    )
    const refundExposureRate =
      totalHistoricalPayments > 0
        ? Math.round((monthSnapshot.totalPrepaid / totalHistoricalPayments) * 100)
        : 0

    monthlyReport.push({
      year: y,
      month: m,
      label: periodLabel(y, m),
      cashRevenue: monthSnapshot.cashRevenue,
      recognizedRevenue: monthSnapshot.totalRecognized,
      netProfit: monthSnapshot.netProfit,
      renewalRate,
      refundExposureRate,
      activeMembers,
    })
  }

  return { ...snapshot, monthlyReport }
}
