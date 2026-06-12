import { isExpired, todayDateString } from '../api/members'
import type { Member } from '../types/database'
import { addDays } from './dates'

export type RenewalFilter =
  | 'all'
  | 'active'
  | 'unregistered'
  | 'renewal'
  | 'urgent'
  | 'expiring'
  | 'terminated'

/** 자가가입 등 PT 미등록 회원 (결제·세션 0) */
export function isUnregisteredMember(member: Member): boolean {
  return member.status !== 'terminated' && member.total_sessions === 0
}

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
  totalSessions?: number,
): PtAlertLevel | null {
  if (status === 'terminated') return null
  if ((totalSessions ?? remaining) === 0) return null
  if (remaining > 5) return null
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
    member.status !== 'terminated' &&
    member.total_sessions > 0 &&
    member.remaining_sessions <= 5
  )
}

export function computeRenewalStats(members: Member[]): RenewalStats {
  return {
    warningCount: members.filter(
      (m) =>
        m.status !== 'terminated' &&
        m.total_sessions > 0 &&
        m.remaining_sessions <= 5,
    ).length,
    urgentCount: members.filter(
      (m) =>
        m.status !== 'terminated' &&
        m.total_sessions > 0 &&
        m.remaining_sessions <= 3,
    ).length,
    expiringCount: members.filter((m) => isExpiringSoon(m.expires_at, m.status))
      .length,
    terminatedCount: members.filter((m) => m.status === 'terminated').length,
  }
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFC').trim().toLowerCase().replace(/\s+/g, '')
}

export function filterBySearch(members: Member[], term: string): Member[] {
  const q = normalizeSearchText(term)
  if (!q) return members

  const qDigits = term.replace(/\D/g, '')

  return members.filter((m) => {
    const name = normalizeSearchText(m.name)
    const trainer = normalizeSearchText(m.trainer_name ?? '')
    const phone = m.phone.replace(/\D/g, '')

    return (
      name.includes(q) ||
      trainer.includes(q) ||
      (qDigits.length > 0 && phone.includes(qDigits))
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
    case 'unregistered':
      return members.filter(isUnregisteredMember)
    case 'renewal':
      return members.filter(isRenewalTarget)
    case 'urgent':
      return members.filter(
        (m) =>
          m.status !== 'terminated' &&
          m.total_sessions > 0 &&
          m.remaining_sessions <= 3,
      )
    case 'expiring':
      return members.filter((m) => isExpiringSoon(m.expires_at, m.status))
    case 'terminated':
      return members.filter((m) => m.status === 'terminated')
    default:
      return members
  }
}

