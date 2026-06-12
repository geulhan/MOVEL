import { useState } from 'react'
import {
  PAYMENT_CATEGORIES,
  PAYMENT_CATEGORY_LABELS,
  type PaymentCategory,
} from '../../constants/paymentCategories'
import { CenterPassProductEditor } from './CenterPassProductEditor'
import { LockerTowelProductEditor } from './LockerTowelProductEditor'
import { PtPricingEditor } from './PtPricingEditor'

export function PaymentCategoryPricingPanel() {
  const [category, setCategory] = useState<PaymentCategory>('pt')

  return (
    <div className="space-y-4">
      <nav className="chip-scroll -mx-1 px-1">
        {PAYMENT_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`chip ${category === item ? 'chip-active' : 'chip-inactive'}`}
          >
            {PAYMENT_CATEGORY_LABELS[item]}
          </button>
        ))}
      </nav>

      {category === 'pt' ? (
        <PtPricingEditor />
      ) : category === 'center_pass' ? (
        <CenterPassProductEditor />
      ) : (
        <LockerTowelProductEditor />
      )}
    </div>
  )
}
