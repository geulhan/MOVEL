export type CenterServicePeriod = {
  startsAt: string | null
  endsAt: string | null
  periodOk: boolean
}

export type ServicePeriodStatus =
  | 'active'
  | 'suspended'
  | 'expired'
  | 'not_started'
  | 'unlimited'
  | 'inactive'

export function parseServicePeriod(raw: {
  service_starts_at?: unknown
  service_ends_at?: unknown
  service_period_ok?: unknown
}): CenterServicePeriod {
  return {
    startsAt: toDateString(raw.service_starts_at),
    endsAt: toDateString(raw.service_ends_at),
    periodOk: raw.service_period_ok === true,
  }
}

function toDateString(value: unknown): string | null {
  if (value == null || value === '') return null
  const text = String(value)
  return text.slice(0, 10)
}

export function formatServicePeriod(period: CenterServicePeriod): string {
  if (!period.startsAt && !period.endsAt) return '기간 미설정'
  if (period.startsAt && period.endsAt) {
    return `${formatKoreanDate(period.startsAt)} ~ ${formatKoreanDate(period.endsAt)}`
  }
  if (period.startsAt) return `${formatKoreanDate(period.startsAt)} ~`
  return `~ ${formatKoreanDate(period.endsAt!)}`
}

function formatKoreanDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${y}.${m}.${d}`
}

export function getServicePeriodStatus(
  centerStatus: string,
  period: CenterServicePeriod,
): ServicePeriodStatus {
  if (centerStatus === 'suspended') return 'suspended'
  if (centerStatus === 'inactive') return 'inactive'
  if (!period.startsAt && !period.endsAt) return 'unlimited'

  const today = new Date()
  const todayKey = toLocalDateKey(today)

  if (period.startsAt && period.startsAt > todayKey) return 'not_started'
  if (period.endsAt && period.endsAt < todayKey) return 'expired'
  return 'active'
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const SERVICE_PERIOD_STATUS_LABELS: Record<ServicePeriodStatus, string> = {
  active: '이용 중',
  suspended: '정지',
  expired: '만료',
  not_started: '시작 전',
  unlimited: '무기한',
  inactive: '비활성',
}
