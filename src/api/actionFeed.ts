import { getCurrentCenterId } from '../lib/center'
import { supabase } from '../lib/supabase'
import { fetchTodayCenterAttendanceBoard } from './attendance'
import { fetchClassDashboardStats } from './classes'
import { fetchKpiDashboard } from './kpi'
import { fetchLeads } from './leads'
import { fetchMembers, todayDateString } from './members'
import { fetchPaymentRequests } from './paymentRequests'
import { buildActionFeed } from '../lib/actionEngine/buildFeed'
import type { ActionFeedContext } from '../lib/actionEngine/context'
import type { ActionFeedSnapshot } from '../types/actionEngine'
import type { Member } from '../types/database'

async function loadLastAttendanceByMember(
  centerId: string,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('member_id, checked_in_at')
    .eq('center_id', centerId)
    .order('checked_in_at', { ascending: false })
    .limit(5000)

  if (error) throw error

  const map = new Map<string, string>()
  for (const row of data ?? []) {
    const memberId = String(row.member_id)
    if (!map.has(memberId)) {
      map.set(memberId, String(row.checked_in_at))
    }
  }
  return map
}

async function loadLastScheduleByMember(
  centerId: string,
): Promise<Map<string, string>> {
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const { data, error } = await supabase
    .from('pt_schedules')
    .select('member_id, scheduled_at')
    .eq('center_id', centerId)
    .neq('status', 'cancelled')
    .gte('scheduled_at', since.toISOString())
    .order('scheduled_at', { ascending: false })
    .limit(5000)

  if (error) throw error

  const map = new Map<string, string>()
  for (const row of data ?? []) {
    const memberId = String(row.member_id)
    if (!map.has(memberId)) {
      map.set(memberId, String(row.scheduled_at))
    }
  }
  return map
}

async function loadCompletedSessionsByMember(
  centerId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('session_logs')
    .select('member_id, quantity')
    .eq('center_id', centerId)
    .limit(10000)

  if (error) {
    if (error.code === 'PGRST116' || error.code === '42P01') {
      return new Map()
    }
    throw error
  }

  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const memberId = String(row.member_id)
    const qty = Number(row.quantity) || 1
    map.set(memberId, (map.get(memberId) ?? 0) + qty)
  }
  return map
}

async function loadReviewRequestedMemberIds(
  centerId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('reward_transactions')
    .select('member_id, event_key')
    .eq('center_id', centerId)
    .like('event_key', 'naver_review:%')
    .limit(5000)

  if (error) {
    if (error.code === 'PGRST116' || error.code === '42P01') {
      return new Set()
    }
    throw error
  }

  return new Set((data ?? []).map((row) => String(row.member_id)))
}

function scopeMembers(
  members: Member[],
  trainerId?: string | null,
): Set<string> | null {
  if (!trainerId) return null
  return new Set(
    members.filter((member) => member.trainer_id === trainerId).map((m) => m.id),
  )
}

export async function fetchActionFeedSnapshot(options?: {
  includeClass?: boolean
  trainerId?: string | null
}): Promise<ActionFeedSnapshot> {
  const today = todayDateString()
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString('ko-KR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const centerId = await getCurrentCenterId()

  const [
    members,
    leads,
    attendanceToday,
    pendingPayments,
    kpi,
    lastAttendanceByMember,
    lastScheduleByMember,
    completedSessionsByMember,
    reviewRequestedMemberIds,
    classStats,
  ] = await Promise.all([
    fetchMembers(),
    fetchLeads(),
    fetchTodayCenterAttendanceBoard(),
    fetchPaymentRequests({ status: 'pending', limit: 50 }),
    fetchKpiDashboard(),
    loadLastAttendanceByMember(centerId),
    loadLastScheduleByMember(centerId),
    loadCompletedSessionsByMember(centerId),
    loadReviewRequestedMemberIds(centerId),
    options?.includeClass === false
      ? Promise.resolve(null)
      : fetchClassDashboardStats(today).catch(() => null),
  ])

  const trainerMemberIds = scopeMembers(members, options?.trainerId)

  const scopedRenewalRisk = trainerMemberIds
    ? kpi.renewalRiskTop10.filter((row) => trainerMemberIds.has(row.member_id))
    : kpi.renewalRiskTop10

  const scopedAttendanceRows = trainerMemberIds
    ? attendanceToday.rows.filter((row) => trainerMemberIds.has(row.memberId))
    : attendanceToday.rows

  const scopedPayments = trainerMemberIds
    ? pendingPayments.filter((request) => trainerMemberIds.has(request.member_id))
    : pendingPayments

  const scopedLeads = trainerMemberIds
    ? leads.filter(
        (lead) =>
          !lead.assigned_trainer_id ||
          lead.assigned_trainer_id === options?.trainerId,
      )
    : leads

  const context: ActionFeedContext = {
    today,
    members,
    leads: scopedLeads,
    attendanceRows: scopedAttendanceRows,
    pendingPayments: scopedPayments,
    renewalRisk: scopedRenewalRisk,
    classTodayCount: classStats?.todayClassCount ?? 0,
    classReservationCount: classStats?.todayReservationCount ?? 0,
    lastAttendanceByMember,
    lastScheduleByMember,
    completedSessionsByMember,
    reviewRequestedMemberIds,
    trainerMemberIds,
  }

  const actions = buildActionFeed(context)

  return {
    dateLabel,
    actions,
    generatedAt: new Date().toISOString(),
  }
}
