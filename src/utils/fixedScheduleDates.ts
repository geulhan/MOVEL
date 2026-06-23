export type DayTimeMap = Record<number, string>

/** 고정 수업: 요일(0=일…6=토) 기준으로 count개의 미래 일정 시각 생성 */
export function buildFixedScheduleDates(
  dayOfWeek: number,
  timeHHMM: string,
  count: number,
): Date[] {
  return buildMultiDayScheduleDates([dayOfWeek], timeHHMM, count)
}

export function normalizeDayTimes(
  days: number[],
  dayTimes: DayTimeMap | Record<string, string> | undefined | null,
  fallbackTime: string,
): DayTimeMap {
  const result: DayTimeMap = {}
  for (const day of days) {
    const raw =
      dayTimes && typeof dayTimes === 'object'
        ? (dayTimes as Record<string, string>)[String(day)] ??
          (dayTimes as DayTimeMap)[day]
        : undefined
    result[day] = (raw?.trim() || fallbackTime).trim() || fallbackTime
  }
  return result
}

export function primaryTimeOfDay(dayTimes: DayTimeMap): string {
  const values = Object.values(dayTimes)
  return values[0] ?? '10:00'
}

export function serializeDayTimesForDb(
  dayTimes: DayTimeMap,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(dayTimes).map(([day, time]) => [String(day), time]),
  )
}

/** 복수 요일 — 잔여 세션 수만큼 가장 가까운 날짜부터 순서대로 배치 */
export function buildMultiDayScheduleDates(
  daysOfWeek: number[],
  timeHHMM: string,
  count: number,
): Date[] {
  const dayTimes = Object.fromEntries(
    daysOfWeek.map((day) => [day, timeHHMM]),
  ) as DayTimeMap
  return buildMultiDayScheduleDatesWithTimes(dayTimes, count)
}

/** 요일별 서로 다른 시간 — 잔여 세션 수만큼 가장 가까운 날짜부터 순서대로 배치 */
export function buildMultiDayScheduleDatesWithTimes(
  dayTimes: DayTimeMap,
  count: number,
): Date[] {
  if (count <= 0) return []

  const days = Object.keys(dayTimes)
    .map((d) => parseInt(d, 10))
    .filter((d) => d >= 0 && d <= 6 && dayTimes[d])
  if (days.length === 0) return []

  const daySet = new Set(days)
  const dates: Date[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  let guard = 0
  const maxDays = Math.max(count * 14, 365)

  while (dates.length < count && guard < maxDays) {
    const dow = cursor.getDay()
    if (daySet.has(dow)) {
      const timeHHMM = dayTimes[dow]
      const [hours, minutes] = timeHHMM.split(':').map((v) => parseInt(v, 10))
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

/** 그룹수업 고정 일정: weeksAhead 주 동안 선택 요일의 미래 일정 생성 */
export function buildClassFixedScheduleDates(
  daysOfWeek: number[],
  timeHHMM: string,
  weeksAhead: number,
): Date[] {
  if (weeksAhead <= 0 || daysOfWeek.length === 0) return []

  const daySet = new Set(daysOfWeek)
  const [hours, minutes] = timeHHMM.split(':').map((v) => parseInt(v, 10))
  const dates: Date[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  const endDate = new Date(cursor)
  endDate.setDate(endDate.getDate() + weeksAhead * 7)

  while (cursor.getTime() <= endDate.getTime()) {
    if (daySet.has(cursor.getDay())) {
      const slot = new Date(cursor)
      slot.setHours(hours, minutes, 0, 0)
      if (slot.getTime() > Date.now()) {
        dates.push(slot)
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}
