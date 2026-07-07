import { getCurrentCenterId } from '../lib/center'
import { monthBounds, ptRecognizedByTrainer } from '../lib/recognitionRevenue'
import { normalizeMember } from '../lib/memberNormalize'
import { supabase } from '../lib/supabase'
import type { MotionHubAssistantContext, AssistantMemberInsight, AssistantTrainerInsight } from '../types/motionHubAiAssistant'
import type { Member, Trainer } from '../types/database'
import { isRenewalTarget } from '../utils/renewal'
import { fetchBusinessAnalytics } from './businessAnalytics'
import { fetchBusinessAnalyticsSettings } from './businessAnalyticsSettings'
import { fetchActionFeedSnapshot } from './actionFeed'
import { fetchTrainers } from './trainers'
import { formatPhone } from './members'

type PaymentRow = {
  member_id: string
  amount: number
  paid_at: string | null
}

type AttendanceRow = {
  member_id: string
  checked_in_at: string
}

type ScheduleRow = {
  member_id: string
  status: string
}

type SessionLogRow = {
  id: string
  member_id: string
  deducted_at: string
  quantity: number
}

function memberUnitRefundRisk(member: Member): number {
  if (member.status === 'terminated' || member.remaining_sessions <= 0) return 0
  const amount = Number(member.payment_amount)
  const total = Number(member.total_sessions)
  if (total <= 0 || amount <= 0) return 0
  return Math.round((amount / total) * member.remaining_sessions)
}

function buildMemberInsights(
  members: Member[],
  payments: PaymentRow[],
  attendances: AttendanceRow[],
  schedules: ScheduleRow[],
): AssistantMemberInsight[] {
  const lastPaymentByMember = new Map<string, PaymentRow>()
  for (const row of payments) {
    if (!row.paid_at) continue
    const prev = lastPaymentByMember.get(row.member_id)
    if (!prev || row.paid_at > (prev.paid_at ?? '')) {
      lastPaymentByMember.set(row.member_id, row)
    }
  }

  const lastAttendanceByMember = new Map<string, string>()
  for (const row of attendances) {
    const prev = lastAttendanceByMember.get(row.member_id)
    if (!prev || row.checked_in_at > prev) {
      lastAttendanceByMember.set(row.member_id, row.checked_in_at)
    }
  }

  const scheduleStats = new Map<string, { scheduled: number; completed: number; noShow: number }>()
  for (const row of schedules) {
    const stats = scheduleStats.get(row.member_id) ?? {
      scheduled: 0,
      completed: 0,
      noShow: 0,
    }
    if (row.status !== 'cancelled') stats.scheduled += 1
    if (row.status === 'completed') stats.completed += 1
    if (row.status === 'no_show') stats.noShow += 1
    scheduleStats.set(row.member_id, stats)
  }

  return members
    .filter((m) => m.status !== 'terminated')
    .map((member) => {
      const sched = scheduleStats.get(member.id) ?? {
        scheduled: 0,
        completed: 0,
        noShow: 0,
      }
      const attendanceRate =
        sched.scheduled > 0
          ? Math.round((sched.completed / sched.scheduled) * 100)
          : null
      const lastPay = lastPaymentByMember.get(member.id)

      return {
        memberId: member.id,
        name: member.name,
        phone: formatPhone(member.phone),
        status: member.status,
        remainingSessions: member.remaining_sessions,
        totalSessions: member.total_sessions,
        trainerName: member.trainer_name,
        lastPaymentAt: lastPay?.paid_at?.slice(0, 10) ?? null,
        lastPaymentAmount: lastPay ? Number(lastPay.amount) : null,
        lastAttendanceAt: lastAttendanceByMember.get(member.id)?.slice(0, 10) ?? null,
        scheduledThisMonth: sched.scheduled,
        completedThisMonth: sched.completed,
        noShowThisMonth: sched.noShow,
        attendanceRateThisMonth: attendanceRate,
        estimatedRefundRisk: memberUnitRefundRisk(member),
        isRenewalTarget: isRenewalTarget(member),
        expiresAt: member.expires_at?.slice(0, 10) ?? null,
      }
    })
}

async function loadAssistantRawData(centerId: string, year: number, month: number) {
  const { start, end } = monthBounds(year, month)
  const rangeStart = `${start}T00:00:00+09:00`
  const rangeEnd = `${end}T23:59:59+09:00`
  const attendanceSince = new Date(year, month - 2, 1).toISOString()

  const [
    membersRes,
    paymentsRes,
    attendanceRes,
    schedulesRes,
    sessionLogsRes,
    memberTrainersRes,
    ptPaymentsRes,
  ] = await Promise.all([
    supabase.from('members').select('*').eq('center_id', centerId),
    supabase
      .from('payment_history')
      .select('member_id, amount, paid_at')
      .eq('center_id', centerId)
      .not('paid_at', 'is', null),
    supabase
      .from('attendance_logs')
      .select('member_id, checked_in_at')
      .eq('center_id', centerId)
      .gte('checked_in_at', attendanceSince),
    supabase
      .from('pt_schedules')
      .select('member_id, status')
      .eq('center_id', centerId)
      .gte('scheduled_at', rangeStart)
      .lte('scheduled_at', rangeEnd),
    supabase
      .from('session_logs')
      .select('id, member_id, deducted_at, quantity')
      .eq('center_id', centerId),
    supabase
      .from('members')
      .select('id, trainer_id, trainer_name, registered_at')
      .eq('center_id', centerId),
    supabase
      .from('payment_history')
      .select('id, member_id, amount, sessions, paid_at, category')
      .eq('center_id', centerId),
  ])

  if (membersRes.error) throw membersRes.error
  if (paymentsRes.error) throw paymentsRes.error
  if (attendanceRes.error) throw attendanceRes.error
  if (schedulesRes.error) throw schedulesRes.error
  if (sessionLogsRes.error) throw sessionLogsRes.error
  if (memberTrainersRes.error) throw memberTrainersRes.error
  if (ptPaymentsRes.error) throw ptPaymentsRes.error

  return {
    members: (membersRes.data ?? []).map((row) => normalizeMember(row as Member)),
    payments: (paymentsRes.data ?? []) as PaymentRow[],
    attendances: (attendanceRes.data ?? []) as AttendanceRow[],
    schedules: (schedulesRes.data ?? []) as ScheduleRow[],
    sessionLogs: (sessionLogsRes.data ?? []) as SessionLogRow[],
    memberRows: memberTrainersRes.data ?? [],
    ptPayments: (ptPaymentsRes.data ?? [])
      .filter((p) => p.paid_at)
      .map((p) => ({
        id: String(p.id),
        memberId: String(p.member_id),
        amount: Number(p.amount),
        sessions: Number(p.sessions),
        paidAt: String(p.paid_at),
      })),
  }
}

function buildTrainerInsights(
  trainers: Trainer[],
  members: Member[],
  memberInsights: AssistantMemberInsight[],
  raw: Awaited<ReturnType<typeof loadAssistantRawData>>,
  year: number,
  month: number,
): AssistantTrainerInsight[] {
  const { prefix } = monthBounds(year, month)
  const memberTrainers = raw.memberRows.map((m) => ({
    memberId: String(m.id),
    trainerId: m.trainer_id ? String(m.trainer_id) : null,
    trainerName: m.trainer_name ? String(m.trainer_name) : null,
  }))

  const sessionLogs = raw.sessionLogs.map((l) => ({
    id: String(l.id),
    memberId: l.member_id,
    deductedAt: l.deducted_at,
    quantity: l.quantity,
  }))

  return trainers
    .filter((t) => t.is_active)
    .map((trainer) => {
      const assignedMembers = members.filter((m) => m.trainer_id === trainer.id)
      const assignedInsights = memberInsights.filter((m) =>
        assignedMembers.some((am) => am.id === m.memberId),
      )
      const newMembersThisMonth = assignedMembers.filter((m) =>
        String(m.registered_at).startsWith(prefix),
      ).length

      const renewalTargets = assignedInsights.filter((m) => m.isRenewalTarget)
      const activeRenewalTargets = renewalTargets.filter((m) => m.status === 'active')

      const scheduledSessions = assignedInsights.reduce(
        (sum, m) => sum + m.scheduledThisMonth,
        0,
      )
      const completedSessions = assignedInsights.reduce(
        (sum, m) => sum + m.completedThisMonth,
        0,
      )

      const cashRevenueThisMonth = raw.ptPayments
        .filter(
          (p) =>
            assignedMembers.some((m) => m.id === p.memberId) &&
            p.paidAt?.startsWith(prefix),
        )
        .reduce((sum, p) => sum + p.amount, 0)

      const ptRecognizedRevenue = ptRecognizedByTrainer(
        raw.ptPayments,
        sessionLogs,
        memberTrainers,
        trainer.id,
        year,
        month,
      )

      return {
        trainerId: trainer.id,
        trainerName: trainer.name,
        memberCount: assignedMembers.length,
        newMembersThisMonth,
        ptRecognizedRevenue,
        completedSessions,
        scheduledSessions,
        attendanceRate:
          scheduledSessions > 0
            ? Math.round((completedSessions / scheduledSessions) * 100)
            : null,
        renewalTargetCount: renewalTargets.length,
        activeRenewalTargets: activeRenewalTargets.length,
        renewalRate:
          renewalTargets.length > 0
            ? Math.round((activeRenewalTargets.length / renewalTargets.length) * 100)
            : null,
        cashRevenueThisMonth,
      }
    })
    .sort((a, b) => b.ptRecognizedRevenue - a.ptRecognizedRevenue)
}

export async function fetchMotionHubAssistantContext(
  year: number,
  month: number,
): Promise<MotionHubAssistantContext> {
  const centerId = await getCurrentCenterId()
  const [snapshot, settings, trainers, raw, todayOps] = await Promise.all([
    fetchBusinessAnalytics(year, month),
    fetchBusinessAnalyticsSettings(),
    fetchTrainers(),
    loadAssistantRawData(centerId, year, month),
    fetchActionFeedSnapshot({ includeClass: true }).catch(() => null),
  ])

  const memberInsights = buildMemberInsights(
    raw.members,
    raw.payments,
    raw.attendances,
    raw.schedules,
  )
  const trainerInsights = buildTrainerInsights(
    trainers,
    raw.members,
    memberInsights,
    raw,
    year,
    month,
  )

  return {
    snapshot,
    settings,
    trainers,
    members: memberInsights,
    trainerInsights,
    periodLabel: snapshot.period.label,
    todayActions: todayOps?.actions ?? [],
  }
}
