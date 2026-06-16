import {
  isPeriodPaymentCategory,
  isSessionPaymentCategory,
  PAYMENT_CATEGORY_LABELS,
} from '../constants/paymentCategories'
import type { PaymentRequest } from '../types/database'

export function formatPaymentRequestDetail(request: PaymentRequest): string {
  const categoryLabel = PAYMENT_CATEGORY_LABELS[request.category]
  if (isSessionPaymentCategory(request.category)) {
    return `${categoryLabel} · ${request.sessions ?? 0}회`
  }
  const parts = [categoryLabel]
  if (request.duration_days) {
    parts.push(`${request.duration_days}일`)
  }
  if (request.starts_at) {
    parts.push(`시작 ${request.starts_at}`)
  }
  return parts.join(' · ')
}

export function periodPaymentStartsAt(request: PaymentRequest): string | null {
  if (!isPeriodPaymentCategory(request.category)) return null
  return request.starts_at
}

export function paymentRequestFulfillmentHint(category: PaymentRequest['category']): string {
  switch (category) {
    case 'pt':
      return '확인 후 PT가 등록됩니다.'
    case 'pilates':
      return '확인 후 필라테스 회차가 등록됩니다.'
    case 'yoga':
      return '확인 후 요가 회차가 등록됩니다.'
    case 'gx':
      return '확인 후 GX 회차가 등록됩니다.'
    case 'group_pt':
      return '확인 후 소그룹 PT 회차가 등록됩니다.'
    case 'center_pass':
      return '확인 후 설정한 시작일부터 센터 이용권이 자동 등록됩니다.'
    case 'locker_towel':
      return '확인 후 라커·수건 이용이 등록됩니다.'
    default:
      return '확인 후 이용권이 등록됩니다.'
  }
}
