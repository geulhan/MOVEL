import type { SessionLog } from '../types/database'

export type EnrichedSessionLog = SessionLog & {
  quantity: number
  remaining_after: number
}

/** 차감 후 잔여가 없는 기존 로그는 현재 잔여 횟수로 역산합니다. */
export function enrichSessionLogs(
  logs: SessionLog[],
  currentRemaining: number,
): EnrichedSessionLog[] {
  const sorted = [...logs].sort(
    (a, b) =>
      new Date(b.deducted_at).getTime() - new Date(a.deducted_at).getTime(),
  )

  return sorted.map((log, index) => ({
    ...log,
    quantity: log.quantity ?? 1,
    remaining_after:
      log.remaining_after ?? Math.max(0, currentRemaining + index),
  }))
}
