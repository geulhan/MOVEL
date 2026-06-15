/** 고정 수업: 요일(0=일…6=토) 기준으로 count개의 미래 일정 시각 생성 */
export function buildFixedScheduleDates(
  dayOfWeek: number,
  timeHHMM: string,
  count: number,
): Date[] {
  return buildMultiDayScheduleDates([dayOfWeek], timeHHMM, count)
}

/** 복수 요일 — 잔여 세션 수만큼 가장 가까운 날짜부터 순서대로 배치 */
export function buildMultiDayScheduleDates(
  daysOfWeek: number[],
  timeHHMM: string,
  count: number,
): Date[] {
  if (count <= 0 || daysOfWeek.length === 0) return []

  const daySet = new Set(daysOfWeek)
  const [hours, minutes] = timeHHMM.split(':').map((v) => parseInt(v, 10))
  const dates: Date[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  let guard = 0
  const maxDays = Math.max(count * 14, 365)

  while (dates.length < count && guard < maxDays) {
    if (daySet.has(cursor.getDay())) {
      const slot = new Date(cursor)
      slot.setHours(hours, minutes, 0, 0)
      if (slot.getTime() > Date.now()) {
        dates.push(slot)
      }
    }
    cursor.setDate(cursor.getDate() + 1)
    guard++
  }

  return dates
}

export function normalizeDaysOfWeek(days: number[]): number[] {
  return [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
}

export function toLocalScheduleIso(dateStr: string, timeHHMM: string): string {
  return new Date(`${dateStr}T${timeHHMM}:00`).toISOString()
}

export function scheduleDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function scheduleTimeHHMM(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
