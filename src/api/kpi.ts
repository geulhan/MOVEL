import { resolveCenterIdForMember } from '../lib/center'
import { supabase } from '../lib/supabase'
import type { Member } from '../types/database'
import { fetchMembers, isExpired, todayDateString } from './members'
import {
  isExpiringWithin14Days,
  isRenewalPriorityMember,
  isRenewalTarget,
} from '../utils/renewal'

export type DailyTrendPoint = {
  date: string
  count: number
}

export type RenewalRiskMember = {
  member_id: string
  member_name: string
  remaining_sessions: number
  days_left: number | null
  last_attendance_at: string | null
  total_payment_amount: number
}

export type KpiDashboardData = {
  members: {
    total: number
    active: number
  }
  appUsage: {
    login7d: number
    login30d: number
    loginRatePercent: number
  }
  engagement: {
    step7d: number
    step30d: number
    journal7d: number
    journal30d: number
  }
  renewal: {
    expiring14: number
    lowSessions: number
    priority: number
  }
  sales: {
    thisMonth: number
    lastMonth: number
    changePercent: number | null
  }
  notifications: {
    sent7d: number
    failed7d: number
    failRatePercent: number
  }
  trends: {
    logins30d: DailyTrendPoint[]
    steps30d: DailyTrendPoint[]
  }
  renewalRiskTop10: RenewalRiskMember[]
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function monthPrefix(offsetMonths: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + offsetMonths)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function isOperationalActiveMember(member: Member): boolean {
  if (member.status === 'terminated') return false
  const hasSessions = member.remaining_sessions > 0
  const inPeriod =
    !member.expires_at || !isExpired(member.expires_at.slice(0, 10))
  return hasSessions || inPeriod
}

export function memberDaysLeft(member: Member): number | null {
  if (!member.expires_at) return null
  return daysBetween(todayDateString(), member.expires_at.slice(0, 10))
}

function last30DateKeys(): string[] {
  const keys: string[] = []
  const base = new Date()
  base.setHours(12, 0, 0, 0)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    keys.push(d.toISOString().slice(0, 10))
  }
  return keys
}

function buildDailyTrend(
  dates: string[],
  rows: { at: string }[],
): DailyTrendPoint[] {
  const counts = new Map<string, number>()
  for (const date of dates) counts.set(date, 0)

  for (const row of rows) {
    const key = row.at.slice(0, 10)
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return dates.map((date) => ({
    date,
    count: counts.get(date) ?? 0,
  }))
}

function uniqueMemberCount(rows: { member_id: string }[]): number {
  return new Set(rows.map((r) => r.member_id)).size
}

export async function fetchKpiDashboard(): Promise<KpiDashboardData> {
  const centerId = await resolveCenterIdForMember()
  const since30Iso = isoDaysAgo(30)
  const since7Iso = isoDaysAgo(7)
  const trendDates = last30DateKeys()

  const [
    members,
    loginRowsResult,
    stepRowsResult,
    journalRowsResult,
    paymentsResult,
    messageRowsResult,
    attendanceRowsResult,
  ] = await Promise.all([
    fetchMembers(),
    supabase
      .from('member_login_logs')
      .select('member_id, login_at')
      .eq('center_id', centerId)
      .gte('login_at', since30Iso),
    supabase
      .from('step_verifications')
      .select('member_id, created_at')
      .eq('center_id', centerId)
      .eq('status', 'approved')
      .gte('created_at', since30Iso),
    supabase
      .from('exercise_journals')
      .select('member_id, created_at')
      .eq('center_id', centerId)
      .gte('created_at', since30Iso),
    supabase
      .from('payment_history')
      .select('amount, paid_at')
      .eq('center_id', centerId),
    supabase
      .from('message_logs')
      .select('status, created_at')
      .eq('center_id', centerId)
      .gte('created_at', since7Iso),
    supabase
      .from('attendance_logs')
      .select('member_id, checked_in_at')
      .eq('center_id', centerId),
  ])

  if (loginRowsResult.error) {
    const msg = loginRowsResult.error.message ?? ''
    if (!msg.includes('member_login_logs')) throw loginRowsResult.error
  }
  if (stepRowsResult.error) throw stepRowsResult.error
  if (journalRowsResult.error) throw journalRowsResult.error
  if (paymentsResult.error) throw paymentsResult.error
  if (messageRowsResult.error) throw messageRowsResult.error
  if (attendanceRowsResult.error) throw attendanceRowsResult.error

  const loginRows = loginRowsResult.error ? [] : (loginRowsResult.data ?? [])
  const stepRows = stepRowsResult.data ?? []
  const journalRows = journalRowsResult.data ?? []
  const payments = paymentsResult.data ?? []
  const messageRows = messageRowsResult.data ?? []
  const attendanceRows = attendanceRowsResult.data ?? []

  const activeMembers = members.filter(isOperationalActiveMember)
  const login7dRows = loginRows.filter((r) => r.login_at >= since7Iso)
  const login30dRows = loginRows
  const step7dRows = stepRows.filter((r) => r.created_at >= since7Iso)
  const journal7dRows = journalRows.filter((r) => r.created_at >= since7Iso)

  const login7d = uniqueMemberCount(login7dRows)
  const login30d = uniqueMemberCount(login30dRows)
  const loginRatePercent =
    activeMembers.length > 0
      ? Math.round((login30d / activeMembers.length) * 1000) / 10
      : 0

  const thisMonthKey = monthPrefix(0)
  const lastMonthKey = monthPrefix(-1)
  const thisMonth = payments
    .filter((p) => String(p.paid_at).startsWith(thisMonthKey))
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const lastMonth = payments
    .filter((p) => String(p.paid_at).startsWith(lastMonthKey))
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const changePercent =
    lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10
      : null

  const sent7d = messageRows.filter((r) => r.status === 'sent').length
  const failed7d = messageRows.filter((r) => r.status === 'failed').length
  const notified7d = sent7d + failed7d
  const failRatePercent =
    notified7d > 0 ? Math.round((failed7d / notified7d) * 1000) / 10 : 0

  const lastAttendanceByMember = new Map<string, string>()
  for (const row of attendanceRows) {
    const prev = lastAttendanceByMember.get(row.member_id)
    if (!prev || row.checked_in_at > prev) {
      lastAttendanceByMember.set(row.member_id, row.checked_in_at)
    }
  }

  const renewalRiskTop10 = members
    .filter(isRenewalPriorityMember)
    .map((member) => ({
      member_id: member.id,
      member_name: member.name,
      remaining_sessions: member.remaining_sessions,
      days_left: memberDaysLeft(member),
      last_attendance_at: lastAttendanceByMember.get(member.id) ?? null,
      total_payment_amount: member.payment_amount,
    }))
    .sort((a, b) => {
      const dayA = a.days_left ?? 9999
      const dayB = b.days_left ?? 9999
      if (dayA !== dayB) return dayA - dayB
      return a.remaining_sessions - b.remaining_sessions
    })
    .slice(0, 10)

  return {
    members: {
      total: members.filter((m) => m.status !== 'terminated').length,
      active: activeMembers.length,
    },
    appUsage: {
      login7d,
      login30d,
      loginRatePercent,
    },
    engagement: {
      step7d: uniqueMemberCount(step7dRows),
      step30d: uniqueMemberCount(stepRows),
      journal7d: uniqueMemberCount(journal7dRows),
      journal30d: uniqueMemberCount(journalRows),
    },
    renewal: {
      expiring14: members.filter(isExpiringWithin14Days).length,
      lowSessions: members.filter(isRenewalTarget).length,
      priority: members.filter(isRenewalPriorityMember).length,
    },
    sales: {
      thisMonth,
      lastMonth,
      changePercent,
    },
    notifications: {
      sent7d,
      failed7d,
      failRatePercent,
    },
    trends: {
      logins30d: buildDailyTrend(
        trendDates,
        loginRows.map((r) => ({ at: r.login_at })),
      ),
      steps30d: buildDailyTrend(
        trendDates,
        stepRows.map((r) => ({ at: r.created_at })),
      ),
    },
    renewalRiskTop10,
  }
}
