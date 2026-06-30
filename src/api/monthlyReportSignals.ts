import { getCurrentCenterId } from '../lib/center'
import { monthBounds } from '../lib/recognitionRevenue'
import { supabase } from '../lib/supabase'
import type { MonthlyOperationalSignals } from '../types/aiMonthlyReport'
import type { Member } from '../types/database'
import { isRenewalTarget } from '../utils/renewal'

function countExpiringWithinDays(members: Member[], asOfYmd: string, withinDays = 30): number {
  const asOfMs = new Date(`${asOfYmd}T12:00:00`).getTime()
  const limitMs = asOfMs + withinDays * 86_400_000

  return members.filter((member) => {
    if (member.status === 'terminated' || !member.expires_at) return false
    const expMs = new Date(`${member.expires_at.slice(0, 10)}T12:00:00`).getTime()
    return expMs >= asOfMs && expMs <= limitMs
  }).length
}

export async function fetchMonthlyOperationalSignals(
  year: number,
  month: number,
  members: Member[],
  centerId?: string,
): Promise<MonthlyOperationalSignals> {
  const resolvedCenterId = centerId ?? (await getCurrentCenterId())
  const { start, end, prefix } = monthBounds(year, month)
  const rangeStart = `${start}T00:00:00+09:00`
  const rangeEnd = `${end}T23:59:59+09:00`

  const newMemberCount = members.filter((member) =>
    String(member.registered_at).startsWith(prefix),
  ).length

  const dormantMemberCount = members.filter(
    (member) => member.status === 'dormant',
  ).length
  const activeMemberCount = members.filter(
    (member) => member.status === 'active',
  ).length
  const expiringMemberCount = countExpiringWithinDays(members, end, 30)
  const renewalTargetCount = members.filter((member) => isRenewalTarget(member)).length

  const [schedulesResult, leadsResult] = await Promise.all([
    supabase
      .from('pt_schedules')
      .select('status')
      .eq('center_id', resolvedCenterId)
      .gte('scheduled_at', rangeStart)
      .lte('scheduled_at', rangeEnd),
    supabase
      .from('consultation_leads')
      .select('id, status, converted_member_id, created_at')
      .eq('center_id', resolvedCenterId)
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd),
  ])

  if (schedulesResult.error) throw schedulesResult.error
  if (leadsResult.error) {
    if (!leadsResult.error.message?.includes('consultation_leads')) {
      throw leadsResult.error
    }
  }

  const scheduleRows = schedulesResult.data ?? []
  const scheduledSessions = scheduleRows.filter(
    (row) => row.status !== 'cancelled',
  ).length
  const completedSessions = scheduleRows.filter(
    (row) => row.status === 'completed',
  ).length
  const attendanceRate =
    scheduledSessions > 0
      ? Math.round((completedSessions / scheduledSessions) * 100)
      : 100

  const leadRows = leadsResult.data ?? []
  const newLeadCount = leadRows.length
  const convertedLeadCount = leadRows.filter(
    (row) => row.status === 'converted' || Boolean(row.converted_member_id),
  ).length

  return {
    newMemberCount,
    dormantMemberCount,
    activeMemberCount,
    expiringMemberCount,
    renewalTargetCount,
    attendanceRate,
    completedSessions,
    scheduledSessions,
    newLeadCount,
    convertedLeadCount,
  }
}
