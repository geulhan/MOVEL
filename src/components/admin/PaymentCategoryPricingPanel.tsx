import { useEffect, useState } from 'react'
import {
  PAYMENT_CATEGORIES,
  PAYMENT_CATEGORY_LABELS,
  type PaymentCategory,
} from '../../constants/paymentCategories'
import { CenterPassAdminPanel } from './CenterPassAdminPanel'
import { LockerTowelProductEditor } from './LockerTowelProductEditor'
import { PaymentRequestSenderPanel } from './PaymentRequestSenderPanel'
import { PtPricingEditor } from './PtPricingEditor'

type Props = {
  initialCategory?: PaymentCategory
  onCategoryChange?: (category: PaymentCategory) => void
  onPaymentRequestToast?: (message: string) => void
  onPaymentRequestError?: (message: string) => void
}

export function PaymentCategoryPricingPanel({
  initialCategory = 'pt',
  onCategoryChange,
  onPaymentRequestToast,
  onPaymentRequestError,
}: Props) {
  const [category, setCategory] = useState<PaymentCategory>(initialCategory)

  useEffect(() => {
    setCategory(initialCategory)
  }, [initialCategory])

  function selectCategory(next: PaymentCategory) {
    setCategory(next)
    onCategoryChange?.(next)
  }

  return (
    <div className="space-y-4">
      <nav className="chip-scroll -mx-1 px-1">
        {PAYMENT_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => selectCategory(item)}
            className={`chip ${category === item ? 'chip-active' : 'chip-inactive'}`}
          >
            {PAYMENT_CATEGORY_LABELS[item]}
          </button>
        ))}
      </nav>

      <PaymentRequestSenderPanel
        initialCategory={category}
        onToast={onPaymentRequestToast}
        onError={onPaymentRequestError}
      />

      {category === 'pt' ? (
        <PtPricingEditor />
      ) : category === 'center_pass' ? (
        <CenterPassAdminPanel />
      ) : (
        <LockerTowelProductEditor />
      )}
    </div>
  )
}
