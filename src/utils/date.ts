/** 로컬 타임존 기준 오늘 00:00:00 */
export function localDayStartIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** 로컬 타임존 기준 오늘 23:59:59.999 */
export function localDayEndIso(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

/** ISO 시각이 로컬 기준 오늘인지 */
export function isSameLocalDay(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}
