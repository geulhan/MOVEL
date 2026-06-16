export const CENTER_FEATURE_KEYS = ['mileage', 'contracts', 'notifications'] as const

export type CenterFeatureKey = (typeof CENTER_FEATURE_KEYS)[number]

export type CenterFeatures = Record<CenterFeatureKey, boolean>

export const DEFAULT_CENTER_FEATURES: CenterFeatures = {
  mileage: true,
  contracts: false,
  notifications: false,
}

export const CENTER_FEATURE_LABELS: Record<
  CenterFeatureKey,
  { label: string; description: string }
> = {
  mileage: {
    label: '마일리지',
    description: '마일리지 적립·관리 메뉴',
  },
  contracts: {
    label: '전자 계약',
    description: '결제 시 전자 계약서 작성·조회',
  },
  notifications: {
    label: '알림·메시지',
    description: '카카오/문자 등 메시지 발송',
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
