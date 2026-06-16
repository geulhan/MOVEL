import { useEffect, useMemo, useState } from 'react'
import {
  enabledPaymentCategories,
  fetchPaymentCategoryFlags,
} from '../../api/paymentCategorySettings'
import {
  isClassSessionPaymentCategory,
  PAYMENT_CATEGORY_LABELS,
  type PaymentCategory,
} from '../../constants/paymentCategories'
import type { PaymentCategoryFlags } from '../../types/paymentCategorySettings'
import { CenterPassAdminPanel } from './CenterPassAdminPanel'
import { LockerTowelProductEditor } from './LockerTowelProductEditor'
import { PaymentCategoryTogglePanel } from './PaymentCategoryTogglePanel'
import { PaymentRequestSenderPanel } from './PaymentRequestSenderPanel'
import { PtPricingEditor } from './PtPricingEditor'
import { SessionPassPricingEditor } from './SessionPassPricingEditor'

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
  const [flags, setFlags] = useState<PaymentCategoryFlags | null>(null)
  const [category, setCategory] = useState<PaymentCategory>(initialCategory)

  useEffect(() => {
    void fetchPaymentCategoryFlags().then(setFlags).catch(() => {})
  }, [])

  const visibleCategories = useMemo(
    () => (flags ? enabledPaymentCategories(flags) : []),
    [flags],
  )

  useEffect(() => {
    setCategory(initialCategory)
  }, [initialCategory])

  useEffect(() => {
    if (visibleCategories.length === 0) return
    if (!visibleCategories.includes(category)) {
      const next = visibleCategories[0]
      setCategory(next)
      onCategoryChange?.(next)
    }
  }, [visibleCategories, category, onCategoryChange])

  function selectCategory(next: PaymentCategory) {
    setCategory(next)
    onCategoryChange?.(next)
  }

  function renderPricingEditor() {
    if (category === 'pt') return <PtPricingEditor />
    if (isClassSessionPaymentCategory(category)) {
      return <SessionPassPricingEditor category={category} />
    }
    if (category === 'center_pass') return <CenterPassAdminPanel />
    return <LockerTowelProductEditor />
  }

  return (
    <div className="space-y-4">
      <PaymentCategoryTogglePanel onChange={setFlags} />

      {visibleCategories.length === 0 ? (
        <p className="text-sm text-muted">
          판매할 상품 카테고리를 하나 이상 켜 주세요.
        </p>
      ) : (
        <>
          <nav className="chip-scroll -mx-1 px-1">
            {visibleCategories.map((item) => (
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

          {renderPricingEditor()}
        </>
      )}
    </div>
  )
}
