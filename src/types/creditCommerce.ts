/** 메시지 크레딧 상거래 타입 (2단계 결제 연동 대비) */
/** @see docs/message-credit-payment-design.md */

export const CREDIT_ORDER_STATUSES = [
  'pending',
  'paid',
  'cancelled',
  'refund',
] as const

export type CreditOrderStatus = (typeof CREDIT_ORDER_STATUSES)[number]

export const CREDIT_PAYMENT_PROVIDERS = ['toss', 'manual'] as const

export type CreditPaymentProvider = (typeof CREDIT_PAYMENT_PROVIDERS)[number]

export type CreditPackage = {
  id: string
  code: string
  quantity: number
  label: string
  priceKrw: number
  currency: string
  isActive: boolean
  sortOrder: number
}

export type CreditOrder = {
  id: string
  centerId: string
  packageId: string | null
  credits: number
  amountKrw: number
  currency: string
  status: CreditOrderStatus
  paymentProvider: CreditPaymentProvider | null
  providerOrderId: string | null
  providerPaymentKey: string | null
  providerReceiptUrl: string | null
  creditTransactionId: string | null
  paidAt: string | null
  cancelledAt: string | null
  refundedAt: string | null
  createdAt: string
  updatedAt: string
}

export const CREDIT_ORDER_STATUS_LABELS: Record<CreditOrderStatus, string> = {
  pending: '결제 대기',
  paid: '결제 완료',
  cancelled: '취소',
  refund: '환불',
}

/** 플랫폼 수동 지급 프리셋 (1단계) */
export const PLATFORM_CREDIT_GRANT_PRESETS = [30, 100, 500] as const
