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
import {
  splitCenterPassPrepaidByRefundWindow,
  splitPtPrepaidByRefundWindow,
  type PeriodPassRefundInput,
} from '../lib/refundEligibility'
import { fetchContractSettings } from './contractSettings'
import { isRenewalTarget } from '../utils/renewal'
import { normalizeMember } from '../lib/memberNormalize'
import type { Member, Trainer } from '../types/database'
import { resolveTrainerSettlementRate } from '../lib/trainerSettlement'

type CenterPassAnalyticsRow = {
  id: string
  starts_at: string
  ends_at: string
  amount: number | null
  status: string
  payment_history?:
    | {
        paid_at: string | null
        payment_request: { duration_days: number | null } | null
      }
    | null
  center_pass_products?: { duration_days: number } | null
}

type FacilitySubscriptionRow = {
  id: string
  member_id: string
  starts_at: string
  ends_at: string
  amount: number | null
  status: string
}

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
  const [paymentsRes, passesRes, facilityRes, logsRes, membersRes, trainersRes] =
    await Promise.all([
      supabase
        .from('payment_history')
        .select('id, member_id, amount, sessions, paid_at, category')
        .eq('center_id', centerId),
      supabase
        .from('center_passes')
        .select(
          `
          id,
          starts_at,
          ends_at,
          amount,
          status,
          payment_history_id,
          product_id,
          center_pass_products(duration_days),
          payment_history:payment_history_id(
            paid_at,
            payment_request:payment_request_id(duration_days)
          )
        `,
        )
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
      supabase
        .from('trainers')
        .select('id, name, settlement_rate, settlement_mode, settlement_fixed_amount, is_active')
        .eq('center_id', centerId),
    ])

  if (paymentsRes.error) throw paymentsRes.error
  if (passesRes.error) throw passesRes.error
  if (facilityRes.error) throw facilityRes.error
  if (logsRes.error) throw logsRes.error
  if (membersRes.error) throw membersRes.error
  if (trainersRes.error) throw trainersRes.error

  const passRows = (passesRes.data ?? []) as CenterPassAnalyticsRow[]
  const facilityRows = (facilityRes.data ?? []) as FacilitySubscriptionRow[]

  const centerPasses: PeriodPass[] = passRows.map((p) => ({
    id: p.id,
    startsAt: p.starts_at,
    endsAt: p.ends_at,
    amount: Number(p.amount ?? 0),
    status: p.status,
  }))

  const centerPassRefundInputs: PeriodPassRefundInput[] = passRows.map((p) => {
    const payment = p.payment_history as
      | {
          paid_at: string | null
          payment_request: { duration_days: number | null } | null
        }
      | null
      | undefined
    const product = p.center_pass_products as { duration_days: number } | null
    const durationDays =
      Number(product?.duration_days) ||
      Number(payment?.payment_request?.duration_days) ||
      0

    return {
      id: p.id,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      amount: Number(p.amount ?? 0),
      status: p.status,
      paidAt: payment?.paid_at ?? null,
      durationDays,
    }
  })

  const facilityPasses: PeriodPass[] = facilityRows.map((p) => ({
    id: p.id,
    startsAt: p.starts_at,
    endsAt: p.ends_at,
    amount: Number(p.amount ?? 0),
    status: p.status,
  }))

  const facilityRefundInputs: PeriodPassRefundInput[] = facilityRows.map((p) => {
    const totalDays = Math.max(
      1,
      Math.round(
        (new Date(`${p.ends_at}T12:00:00`).getTime() -
          new Date(`${p.starts_at}T12:00:00`).getTime()) /
          86_400_000,
      ) + 1,
    )

    return {
      id: p.id,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      amount: Number(p.amount ?? 0),
      status: p.status,
      paidAt: p.starts_at,
      durationDays: totalDays,
    }
  })

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

  const trainers: Trainer[] = (trainersRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    is_active: row.is_active,
    settlement_mode: row.settlement_mode === 'fixed' ? 'fixed' : 'percent',
    settlement_rate:
      row.settlement_rate == null ? null : Number(row.settlement_rate),
    settlement_fixed_amount:
      row.settlement_fixed_amount == null
        ? null
        : Number(row.settlement_fixed_amount),
    created_at: '',
  }))

  return {
    payments: paymentsRes.data ?? [],
    periodPasses,
    facilityPasses,
    centerPassRefundInputs,
    facilityRefundInputs,
    ptPayments,
    sessionLogs,
    memberTrainers,
    members: (membersRes.data ?? []).map((row) => normalizeMember(row)),
    trainers,
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

function buildFirstPaymentIdSet(
  payments: Array<{ id: string; member_id: string; paid_at: string }>,
): Set<string> {
  const byMember = new Map<string, Array<{ id: string; paid_at: string }>>()

  for (const payment of payments) {
    const list = byMember.get(payment.member_id) ?? []
    list.push({ id: payment.id, paid_at: payment.paid_at })
    byMember.set(payment.member_id, list)
  }

  const firstIds = new Set<string>()
  for (const list of byMember.values()) {
    list.sort((a, b) => {
      const dateOrder = a.paid_at.localeCompare(b.paid_at)
      return dateOrder !== 0 ? dateOrder : a.id.localeCompare(b.id)
    })
    if (list[0]) firstIds.add(list[0].id)
  }

  return firstIds
}

function cashRevenueBreakdownForMonth(
  payments: Array<{
    id: string
    member_id: string
    amount: number
    paid_at: string
  }>,
  year: number,
  month: number,
): { total: number; newMember: number; renewal: number } {
  const firstPaymentIds = buildFirstPaymentIdSet(payments)
  const { prefix } = monthBounds(year, month)

  let newMember = 0
  let renewal = 0

  for (const payment of payments) {
    if (!String(payment.paid_at).startsWith(prefix)) continue
    const amount = Number(payment.amount)
    if (firstPaymentIds.has(payment.id)) newMember += amount
    else renewal += amount
  }

  return {
    total: newMember + renewal,
    newMember,
    renewal,
  }
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

function computeTrainerPayrollTotal(
  ptPayments: PtPayment[],
  sessionLogs: PtSessionLog[],
  memberTrainers: MemberTrainer[],
  trainers: Trainer[],
  defaultRate: number,
  year: number,
  month: number,
  totalPtRecognized: number,
): number {
  const trainerIds = new Set(
    memberTrainers
      .map((link) => link.trainerId)
      .filter((trainerId): trainerId is string => Boolean(trainerId)),
  )

  let assignedRecognized = 0
  let trainerPayroll = 0

  for (const trainerId of trainerIds) {
    const recognized = ptRecognizedByTrainer(
      ptPayments,
      sessionLogs,
      memberTrainers,
      trainerId,
      year,
      month,
    )
    if (recognized <= 0) continue

    assignedRecognized += recognized
    const rate = resolveTrainerSettlementRate(trainerId, trainers, defaultRate)
    trainerPayroll += Math.round(recognized * (rate / 100))
  }

  const unassignedRecognized = Math.max(0, totalPtRecognized - assignedRecognized)
  if (unassignedRecognized > 0) {
    trainerPayroll += Math.round(unassignedRecognized * (defaultRate / 100))
  }

  return trainerPayroll
}

function buildSnapshotForMonth(
  inputs: Awaited<ReturnType<typeof loadRecognitionInputs>>,
  settings: Awaited<ReturnType<typeof fetchBusinessAnalyticsSettings>>,
  contractSettings: Awaited<ReturnType<typeof fetchContractSettings>>,
  year: number,
  month: number,
): Omit<BusinessAnalyticsSnapshot, 'monthlyReport'> {
  const cashBreakdown = cashRevenueBreakdownForMonth(inputs.payments, year, month)
  const cashRevenue = cashBreakdown.total
  const cashRevenueNew = cashBreakdown.newMember
  const cashRevenueRenewal = cashBreakdown.renewal
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
  const daysPerSession = contractSettings.ptRefundDaysPerSession
  const centerPassPrepaid = centerPassPrepaidBalance(inputs.periodPasses, today)
  const ptPrepaid = ptPrepaidBalance(inputs.ptPayments, inputs.sessionLogs)
  const totalPrepaid = centerPassPrepaid + ptPrepaid

  const centerPassSplit = splitCenterPassPrepaidByRefundWindow(
    inputs.centerPassRefundInputs,
    daysPerSession,
    today,
  )
  const facilitySplit = splitCenterPassPrepaidByRefundWindow(
    inputs.facilityRefundInputs,
    daysPerSession,
    today,
  )
  const ptSplit = splitPtPrepaidByRefundWindow(
    inputs.ptPayments,
    inputs.sessionLogs,
    daysPerSession,
    today,
  )

  const centerPassRefundRisk = centerPassSplit.refundable + facilitySplit.refundable
  const centerPassRefundExpired = centerPassSplit.expired + facilitySplit.expired
  const ptRefundRisk = ptSplit.refundable
  const ptRefundExpired = ptSplit.expired
  const totalRefundRisk = centerPassRefundRisk + ptRefundRisk
  const totalRefundExpired = centerPassRefundExpired + ptRefundExpired

  const trainerPayroll = computeTrainerPayrollTotal(
    inputs.ptPayments,
    inputs.sessionLogs,
    inputs.memberTrainers,
    inputs.trainers,
    settings.trainerSettlementRate,
    year,
    month,
    ptRecognized,
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
      ? Math.round((totalRefundRisk / totalHistoricalPayments) * 100)
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
    cashRevenueNew,
    cashRevenueRenewal,
    centerPassRecognized,
    ptRecognized,
    totalRecognized,
    centerPassPrepaid,
    ptPrepaid,
    totalPrepaid,
    centerPassRefundRisk,
    ptRefundRisk,
    totalRefundRisk,
    centerPassRefundExpired,
    ptRefundExpired,
    totalRefundExpired,
    ptRefundDaysPerSession: daysPerSession,
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
  const [settings, contractSettings, inputs] = await Promise.all([
    fetchBusinessAnalyticsSettings(),
    fetchContractSettings(),
    loadRecognitionInputs(centerId),
  ])

  const snapshot = buildSnapshotForMonth(
    inputs,
    settings,
    contractSettings,
    targetYear,
    targetMonth,
  )

  const monthlyReport = []
  for (let offset = -5; offset <= 0; offset += 1) {
    const { year: y, month: m } = shiftMonth(targetYear, targetMonth, offset)
    const monthSnapshot = buildSnapshotForMonth(
      inputs,
      settings,
      contractSettings,
      y,
      m,
    )
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
        ? Math.round((monthSnapshot.totalRefundRisk / totalHistoricalPayments) * 100)
        : 0

    monthlyReport.push({
      year: y,
      month: m,
      label: periodLabel(y, m),
      cashRevenue: monthSnapshot.cashRevenue,
      cashRevenueNew: monthSnapshot.cashRevenueNew,
      cashRevenueRenewal: monthSnapshot.cashRevenueRenewal,
      recognizedRevenue: monthSnapshot.totalRecognized,
      netProfit: monthSnapshot.netProfit,
      renewalRate,
      refundExposureRate,
      activeMembers,
    })
  }

  return { ...snapshot, monthlyReport }
}
