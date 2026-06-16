import { useEffect, useRef, useState } from 'react'
import {
  PAYMENT_CATEGORY_DESCRIPTIONS,
  PAYMENT_CATEGORY_LABELS,
  PAYMENT_CATEGORIES,
  type PaymentCategory,
} from '../../constants/paymentCategories'
import {
  fetchPaymentCategoryFlags,
  savePaymentCategoryFlags,
} from '../../api/paymentCategorySettings'
import { getErrorMessage } from '../../lib/errors'
import type { PaymentCategoryFlags } from '../../types/paymentCategorySettings'
import { btnPrimary, cardClass } from '../../styles/theme'

type Props = {
  onChange?: (flags: PaymentCategoryFlags) => void
}

export function PaymentCategoryTogglePanel({ onChange }: Props) {
  const [flags, setFlags] = useState<PaymentCategoryFlags | null>(null)
  const [draft, setDraft] = useState<PaymentCategoryFlags | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const next = await fetchPaymentCategoryFlags()
        setFlags(next)
        setDraft(next)
        onChangeRef.current?.(next)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function handleToggle(category: PaymentCategory, enabled: boolean) {
    setDraft((prev) => {
      if (!prev) return prev
      const next = { ...prev, [category]: enabled }
      return next
    })
    setSaved(false)
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const next = await savePaymentCategoryFlags(draft)
      setFlags(next)
      setDraft(next)
      onChangeRef.current?.(next)
      setSaved(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">상품 카테고리 설정 불러오는 중…</p>
  }

  return (
    <section className={`${cardClass} card-pad space-y-4`}>
      <div>
        <h3 className="text-base font-semibold text-charcoal">판매 상품 카테고리</h3>
        <p className="mt-1 text-sm text-muted">
          켜 둔 항목만 결제 요청·가격 설정에 표시됩니다. 센터에 맞게 OFF 하세요.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PAYMENT_CATEGORIES.map((category) => {
          const enabled = draft?.[category] ?? false
          return (
            <label
              key={category}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                enabled
                  ? 'border-charcoal/30 bg-cream/60'
                  : 'border-gold/15 bg-white opacity-80'
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-charcoal">
                  {PAYMENT_CATEGORY_LABELS[category]}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {PAYMENT_CATEGORY_DESCRIPTIONS[category]}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => handleToggle(category, !enabled)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  enabled ? 'bg-charcoal' : 'bg-charcoal/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    enabled ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">저장되었습니다.</p>}

      <button
        type="button"
        className={btnPrimary}
        disabled={saving || !draft}
        onClick={() => void handleSave()}
      >
        {saving ? '저장 중…' : '카테고리 설정 저장'}
      </button>

      {flags && draft && JSON.stringify(flags) !== JSON.stringify(draft) && (
        <p className="text-xs text-amber-700">변경 사항이 있습니다. 저장해 주세요.</p>
      )}
    </section>
  )
}
