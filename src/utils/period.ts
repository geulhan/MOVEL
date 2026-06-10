import { SESSION_DAYS_PER_SESSION } from '../constants/session'
import { addDays } from './dates'

/** 등록일 + (세션 수 × 세션당 일수) + 연장일 → 만료일 */
export function calcSessionExpiry(
  registeredAt: string,
  sessions: number,
  extraDays = 0,
): string {
  const baseDays = sessions * SESSION_DAYS_PER_SESSION
  return addDays(registeredAt, baseDays + extraDays)
}

/** 회원 이용 만료일 — 항상 등록(총) 세션 수 기준 (잔여와 무관) */
export function calcMemberExpiry(
  registeredAt: string,
  totalSessions: number,
  extensionDays = 0,
): string {
  return calcSessionExpiry(registeredAt, totalSessions, extensionDays)
}

export function formatSessionPeriodHint(sessions: number): string {
  const days = sessions * SESSION_DAYS_PER_SESSION
  return `${sessions}세션 × ${SESSION_DAYS_PER_SESSION}일 = ${days}일`
}
