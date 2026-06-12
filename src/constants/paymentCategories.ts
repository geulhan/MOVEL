export type PaymentCategory = 'pt' | 'center_pass' | 'locker_towel'

export const PAYMENT_CATEGORIES: PaymentCategory[] = [
  'pt',
  'center_pass',
  'locker_towel',
]

export const PAYMENT_CATEGORY_LABELS: Record<PaymentCategory, string> = {
  pt: 'PT',
  center_pass: '센터 이용권',
  locker_towel: '라커 · 수건',
}

export type FacilitySubType = 'locker' | 'towel' | 'bundle'

export const FACILITY_SUB_TYPE_LABELS: Record<FacilitySubType, string> = {
  locker: '라커',
  towel: '수건',
  bundle: '라커 + 수건',
}

/** PT 외 기간 단위 이용 (시작일·기간일 적용) */
export function isPeriodPaymentCategory(
  category: PaymentCategory,
): category is 'center_pass' | 'locker_towel' {
  return category === 'center_pass' || category === 'locker_towel'
}
