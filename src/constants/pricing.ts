export type PtPackage = {
  id: string
  label: string
  sessions: number
  amount: number
  is_active: boolean
  sort_order: number
}

export type PtPricingConfig = {
  packages: PtPackage[]
  /** 카드 결제액에서 부가세(10%)를 제외한 금액으로 PT 정산·인식매출 계산 */
  excludeVatFromSettlement?: boolean
}

export const DEFAULT_PT_PACKAGES: PtPackage[] = [
  {
    id: 'pt_10',
    label: 'PT 10회',
    sessions: 10,
    amount: 800_000,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'pt_20',
    label: 'PT 20회',
    sessions: 20,
    amount: 1_500_000,
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'pt_30',
    label: 'PT 30회',
    sessions: 30,
    amount: 2_100_000,
    is_active: true,
    sort_order: 3,
  },
]

export const DEFAULT_PT_PRICING: PtPricingConfig = {
  packages: DEFAULT_PT_PACKAGES,
  excludeVatFromSettlement: false,
}

export const PAYMENT_REQUEST_EXPIRY_DAYS = 14

export const PAYMENT_REQUEST_STATUS_LABELS = {
  pending: '결제 대기',
  paid: '결제 완료',
  cancelled: '취소됨',
  expired: '만료됨',
} as const
