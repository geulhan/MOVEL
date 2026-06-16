export const SESSION_PAYMENT_CATEGORIES = [
  'pt',
  'pilates',
  'yoga',
  'gx',
  'group_pt',
] as const

export const PERIOD_PAYMENT_CATEGORIES = ['center_pass', 'locker_towel'] as const

export type SessionPaymentCategory = (typeof SESSION_PAYMENT_CATEGORIES)[number]
export type PeriodPaymentCategory = (typeof PERIOD_PAYMENT_CATEGORIES)[number]

export type PaymentCategory = SessionPaymentCategory | PeriodPaymentCategory

export const PAYMENT_CATEGORIES: PaymentCategory[] = [
  'pt',
  'pilates',
  'yoga',
  'gx',
  'group_pt',
  'center_pass',
  'locker_towel',
]

export const PAYMENT_CATEGORY_LABELS: Record<PaymentCategory, string> = {
  pt: 'PT',
  pilates: '필라테스',
  yoga: '요가',
  gx: 'GX',
  group_pt: '소그룹 PT',
  center_pass: '센터 이용권',
  locker_towel: '라커 · 수건',
}

export const PAYMENT_CATEGORY_DESCRIPTIONS: Record<PaymentCategory, string> = {
  pt: '1:1 PT 회차권 결제',
  pilates: '필라테스 수업 회차권',
  yoga: '요가 수업 회차권',
  gx: 'GX 그룹 수업 회차권',
  group_pt: '소그룹 PT 회차권',
  center_pass: '시설 이용 기간권',
  locker_towel: '라커·수건 기간 이용',
}

export type FacilitySubType = 'locker' | 'towel' | 'bundle'

export const FACILITY_SUB_TYPE_LABELS: Record<FacilitySubType, string> = {
  locker: '라커',
  towel: '수건',
  bundle: '라커 + 수건',
}

export function isSessionPaymentCategory(
  category: PaymentCategory,
): category is SessionPaymentCategory {
  return (SESSION_PAYMENT_CATEGORIES as readonly string[]).includes(category)
}

export function isPeriodPaymentCategory(
  category: PaymentCategory,
): category is PeriodPaymentCategory {
  return category === 'center_pass' || category === 'locker_towel'
}

export function isClassSessionPaymentCategory(
  category: PaymentCategory,
): category is Exclude<SessionPaymentCategory, 'pt'> {
  return category === 'pilates' || category === 'yoga' || category === 'gx' || category === 'group_pt'
}

export function sessionPassTypeFromCategory(
  category: PaymentCategory,
): 'pilates' | 'yoga' | 'gx' | 'group_pt' | null {
  if (isClassSessionPaymentCategory(category)) return category
  return null
}

export function pricingSettingKey(category: SessionPaymentCategory): string {
  return category === 'pt' ? 'pt_pricing' : `${category}_pricing`
}
