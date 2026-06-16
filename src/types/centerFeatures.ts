export const OPERATIONAL_FEATURE_KEYS = [
  'membership',
  'pt',
  'facility',
  'locker',
  'towel',
  'class',
  'pilates',
  'yoga',
  'gx',
  'attendance',
  'exercise_log',
] as const

export const LEGACY_FEATURE_KEYS = ['mileage', 'contracts', 'notifications'] as const

export const CENTER_FEATURE_KEYS = [
  ...OPERATIONAL_FEATURE_KEYS,
  ...LEGACY_FEATURE_KEYS,
] as const

export type OperationalFeatureKey = (typeof OPERATIONAL_FEATURE_KEYS)[number]
export type LegacyFeatureKey = (typeof LEGACY_FEATURE_KEYS)[number]
export type CenterFeatureKey = (typeof CENTER_FEATURE_KEYS)[number]

export type CenterFeatures = Record<CenterFeatureKey, boolean>

export type CenterOperationalType = 'pt' | 'pilates' | 'yoga' | 'gym' | 'hybrid'

/** 기존 센터 호환 — 마이그레이션 전에도 PT 센터 동작 유지 */
export const DEFAULT_CENTER_FEATURES: CenterFeatures = {
  membership: true,
  pt: true,
  facility: true,
  locker: true,
  towel: true,
  class: false,
  pilates: false,
  yoga: false,
  gx: false,
  attendance: true,
  exercise_log: true,
  mileage: true,
  contracts: false,
  notifications: false,
}

export const CENTER_FEATURE_LABELS: Record<
  CenterFeatureKey,
  { label: string; description: string; group: 'operational' | 'addon' }
> = {
  membership: {
    label: '회원 관리',
    description: '회원 등록·조회·CRM',
    group: 'operational',
  },
  pt: {
    label: 'PT',
    description: '1:1 PT 스케줄·차감',
    group: 'operational',
  },
  facility: {
    label: '시설 이용',
    description: '시설 이용권·입장 체크',
    group: 'operational',
  },
  locker: {
    label: '락커',
    description: '락커 배정·만료 관리',
    group: 'operational',
  },
  towel: {
    label: '수건',
    description: '수건 대여·반납',
    group: 'operational',
  },
  class: {
    label: '그룹수업',
    description: '클래스 시간표·예약',
    group: 'operational',
  },
  pilates: {
    label: '필라테스',
    description: '필라테스 수업 유형',
    group: 'operational',
  },
  yoga: {
    label: '요가',
    description: '요가 수업 유형',
    group: 'operational',
  },
  gx: {
    label: 'GX',
    description: '그룹 운동 수업 유형',
    group: 'operational',
  },
  attendance: {
    label: '출석부',
    description: '출석·노쇼·취소 관리',
    group: 'operational',
  },
  exercise_log: {
    label: '운동일지',
    description: '회원 운동 기록·인바디',
    group: 'operational',
  },
  mileage: {
    label: '마일리지',
    description: '마일리지 적립·관리',
    group: 'addon',
  },
  contracts: {
    label: '전자 계약',
    description: '결제 시 전자 계약서',
    group: 'addon',
  },
  notifications: {
    label: '알림·메시지',
    description: '카카오/문자 발송',
    group: 'addon',
  },
}

export const OPERATIONAL_TYPE_LABELS: Record<CenterOperationalType, string> = {
  pt: 'PT',
  pilates: '필라테스',
  yoga: '요가',
  gym: '헬스장',
  hybrid: '복합센터',
}

export const OPERATIONAL_TYPE_PRESETS: Record<
  CenterOperationalType,
  Partial<CenterFeatures>
> = {
  pt: {
    membership: true,
    pt: true,
    facility: false,
    locker: false,
    towel: false,
    class: false,
    pilates: false,
    yoga: false,
    gx: false,
    attendance: true,
    exercise_log: true,
  },
  pilates: {
    membership: true,
    pt: false,
    facility: false,
    locker: false,
    towel: false,
    class: true,
    pilates: true,
    yoga: false,
    gx: false,
    attendance: true,
    exercise_log: false,
  },
  yoga: {
    membership: true,
    pt: false,
    facility: false,
    locker: false,
    towel: false,
    class: true,
    pilates: false,
    yoga: true,
    gx: false,
    attendance: true,
    exercise_log: false,
  },
  gym: {
    membership: true,
    pt: false,
    facility: true,
    locker: true,
    towel: true,
    class: false,
    pilates: false,
    yoga: false,
    gx: false,
    attendance: true,
    exercise_log: false,
  },
  hybrid: {
    membership: true,
    pt: true,
    facility: true,
    locker: true,
    towel: true,
    class: true,
    pilates: true,
    yoga: true,
    gx: true,
    attendance: true,
    exercise_log: true,
  },
}

export function parseCenterFeatures(raw: unknown): CenterFeatures {
  const next = { ...DEFAULT_CENTER_FEATURES }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return next

  for (const key of CENTER_FEATURE_KEYS) {
    const value = (raw as Record<string, unknown>)[key]
    if (typeof value === 'boolean') next[key] = value
  }
  return next
}

export function isFeatureEnabled(
  features: CenterFeatures,
  key: CenterFeatureKey,
): boolean {
  return features[key] === true
}

export function isAnyFeatureEnabled(
  features: CenterFeatures,
  keys: CenterFeatureKey[],
): boolean {
  return keys.some((key) => isFeatureEnabled(features, key))
}

export function isClassFeatureEnabled(features: CenterFeatures): boolean {
  return isAnyFeatureEnabled(features, ['class', 'pilates', 'yoga', 'gx'])
}

export function isFacilityFeatureEnabled(features: CenterFeatures): boolean {
  return isAnyFeatureEnabled(features, ['facility', 'locker', 'towel'])
}
