import type { PaymentCategory } from '../constants/paymentCategories'

export type PaymentCategoryFlags = Record<PaymentCategory, boolean>

export const DEFAULT_PAYMENT_CATEGORY_FLAGS: PaymentCategoryFlags = {
  pt: true,
  pilates: false,
  yoga: false,
  gx: false,
  group_pt: false,
  center_pass: true,
  locker_towel: true,
}
