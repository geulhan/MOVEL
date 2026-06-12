import { PAYMENT_CATEGORY_LABELS } from '../constants/paymentCategories'
import type { PaymentRequest } from '../types/database'

export function formatPaymentRequestDetail(request: PaymentRequest): string {
  const categoryLabel = PAYMENT_CATEGORY_LABELS[request.category]
  if (request.category === 'pt') {
    return `${categoryLabel} · ${request.sessions ?? 0}회`
  }
  if (request.duration_days) {
    return `${categoryLabel} · ${request.duration_days}일`
  }
  return categoryLabel
}

export function paymentRequestFulfillmentHint(category: PaymentRequest['category']): string {
  switch (category) {
    case 'pt':
      return '확인 후 PT가 등록됩니다.'
    case 'center_pass':
      return '확인 후 센터 이용권이 등록됩니다.'
    case 'locker_towel':
      return '확인 후 라커·수건 이용이 등록됩니다.'
  }
}
