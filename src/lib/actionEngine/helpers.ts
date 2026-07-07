import type { Member } from '../../types/database'
import type { ActionPriority } from '../../types/actionEngine'
import { todayDateString } from '../../api/members'

export const PRIORITY_RANK: Record<ActionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function daysSinceDate(iso: string | null | undefined): number | null {
  if (!iso) return null
  const date = iso.slice(0, 10)
  const today = todayDateString()
  const ms =
    new Date(`${today}T12:00:00`).getTime() - new Date(`${date}T12:00:00`).getTime()
  return Math.floor(ms / 86_400_000)
}

export function hoursSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
}

export function formatElapsedHours(iso: string | null | undefined): string {
  const hours = hoursSince(iso)
  if (hours == null) return ''
  if (hours < 1) return '방금 전'
  if (hours < 24) return `${hours}시간 경과`
  const days = Math.floor(hours / 24)
  return `${days}일 경과`
}

export function renewalSuccessRate(input: {
  member: Member
  lastAttendanceAt: string | null
  daysSinceLastSchedule: number | null
}): number {
  let rate = 45
  const { member, lastAttendanceAt, daysSinceLastSchedule } = input

  if (member.remaining_sessions <= 1) rate += 25
  else if (member.remaining_sessions <= 2) rate += 18
  else if (member.remaining_sessions <= 3) rate += 10

  const attendanceGap = daysSinceDate(lastAttendanceAt)
  if (attendanceGap != null && attendanceGap <= 7) rate += 15
  else if (attendanceGap != null && attendanceGap <= 14) rate += 8

  if (daysSinceLastSchedule != null && daysSinceLastSchedule <= 7) rate += 12
  if (member.status === 'active') rate += 5

  return Math.min(95, Math.max(35, rate))
}

export function deadlineLabelForPriority(
  priority: ActionPriority,
  deadline: string | null,
): string {
  if (deadline === todayDateString()) {
    return priority === 'critical' ? '즉시 처리' : '오늘까지'
  }
  if (deadline) return `마감 ${deadline}`
  if (priority === 'critical') return '즉시 처리'
  if (priority === 'high') return '오늘 권장'
  return '이번 주'
}
