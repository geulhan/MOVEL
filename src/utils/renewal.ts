import { isExpired, todayDateString } from '../api/members'
import type { Member } from '../types/database'
import { addDays } from './dates'

export type RenewalFilter =
  | 'all'
  | 'active'
  | 'renewal'
  | 'urgent'
  | 'expiring'
  | 'terminated'

export type PtAlertLevel = 'critical' | 'urgent' | 'warning'

export type RenewalStats = {
  warningCount: number
  urgentCount: number
  expiringCount: number
  terminatedCount: number
}

const EXPIRING_DAYS = 7

export function getPtAlertLevel(
  remaining: number,
  status: Member['status'],
): PtAlertLevel | null {
  if (status === 'terminated' || remaining > 5) return null
  if (remaining <= 1) return 'critical'
  if (remaining <= 3) return 'urgent'
  return 'warning'
}

export function isExpiringSoon(
  expiresAt: string | null,
  status: Member['status'],
): boolean {
  if (!expiresAt || status === 'terminated') return false
  if (isExpired(expiresAt)) return false

  const today = todayDateString()
  const limit = addDays(today, EXPIRING_DAYS)
  return expiresAt >= today && expiresAt <= limit
}

export function isRenewalTarget(member: Member): boolean {
  return (
    member.status !== 'terminated' && member.remaining_sessions <= 5
  )
}

export function computeRenewalStats(members: Member[]): RenewalStats {
  return {
    warningCount: members.filter(
      (m) => m.status !== 'terminated' && m.remaining_sessions <= 5,
    ).length,
    urgentCount: members.filter(
      (m) => m.status !== 'terminated' && m.remaining_sessions <= 3,
    ).length,
    expiringCount: members.filter((m) => isExpiringSoon(m.expires_at, m.status))
      .length,
    terminatedCount: members.filter((m) => m.status === 'terminated').length,
  }
}

export function filterBySearch(members: Member[], term: string): Member[] {
  const q = term.trim().toLowerCase()
  if (!q) return members

  return members.filter((m) => {
    const phone = m.phone.replace(/\D/g, '')
    const qDigits = q.replace(/\D/g, '')
    return (
      m.name.toLowerCase().includes(q) ||
      (qDigits && phone.includes(qDigits)) ||
      (m.trainer_name?.toLowerCase().includes(q) ?? false)
    )
  })
}

export function applyRenewalFilter(
  members: Member[],
  filter: RenewalFilter,
): Member[] {
  switch (filter) {
    case 'active':
      return members.filter((m) => m.status === 'active')
    case 'renewal':
      return members.filter(isRenewalTarget)
    case 'urgent':
      return members.filter(
        (m) => m.status !== 'terminated' && m.remaining_sessions <= 3,
      )
    case 'expiring':
      return members.filter((m) => isExpiringSoon(m.expires_at, m.status))
    case 'terminated':
      return members.filter((m) => m.status === 'terminated')
    default:
      return members
  }
}

