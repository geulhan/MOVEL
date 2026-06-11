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

/** 최초 등록 시: 등록일 + 총 세션 수 (결제 이력 없을 때 폴백) */
export function calcMemberExpiry(
  registeredAt: string,
  totalSessions: number,
  extensionDays = 0,
): string {
  return calcSessionExpiry(registeredAt, totalSessions, extensionDays)
}

/** 재등록·추가 결제 시: 해당 결제일 + 그 결제의 PT 횟수만큼 기간 산정 */
export function calcPaymentExpiry(
  paidAt: string,
  sessions: number,
  extensionDays = 0,
): string {
  return calcSessionExpiry(paidAt, sessions, extensionDays)
}

export function formatSessionPeriodHint(sessions: number): string {
  const days = sessions * SESSION_DAYS_PER_SESSION
  return `${sessions}세션 × ${SESSION_DAYS_PER_SESSION}일 = ${days}일`
}
