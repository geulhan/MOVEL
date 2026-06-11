import { useEffect, useMemo, useState } from 'react'
import { formatCurrency } from '../../api/members'
import type { PaymentRequestWithMember } from '../../api/paymentRequests'
import {
  calcMaxRedeemableMiles,
  fetchRewardBalance,
} from '../../api/rewards'
import { REDEMPTION_MAX_PERCENT } from '../../constants/rewards'
import { btnGold, btnOutline, inputClass } from '../../styles/theme'

type Props = {
  request: PaymentRequestWithMember | null
  open: boolean
  saving: boolean
  onClose: () => void
  onConfirm: (milesToUse: number) => Promise<void>
}

export function CompletePaymentModal({
  request,
  open,
  saving,
  onClose,
  onConfirm,
}: Props) {
  const [availableMiles, setAvailableMiles] = useState(0)
  const [milesInput, setMilesInput] = useState('')
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contractAmount = request ? Number(request.amount) : 0
  const maxUsable = useMemo(
    () => calcMaxRedeemableMiles(contractAmount, availableMiles),
    [contractAmount, availableMiles],
  )

  const milesToUse = useMemo(() => {
    const parsed = Number(milesInput.replace(/,/g, ''))
    if (!Number.isFinite(parsed) || parsed < 0) return 0
    return Math.min(Math.floor(parsed), maxUsable)
  }, [milesInput, maxUsable])

  const cashAmount = contractAmount - milesToUse

  useEffect(() => {
    if (!open || !request) return
    setMilesInput('')
    setError(null)
    setLoadingBalance(true)
    void fetchRewardBalance(request.member_id)
      .then((balance) => setAvailableMiles(balance.move_mile))
      .catch(() => setAvailableMiles(0))
      .finally(() => setLoadingBalance(false))
  }, [open, request])

  if (!open || !request) return null

  async function handleSubmit() {
    setError(null)
    try {
      await onConfirm(milesToUse)
    } catch (err) {
      setError(err instanceof Error ? err.message : '완료 처리에 실패했습니다.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-2xl border border-gold/30 bg-white p-5 shadow-xl"
        role="dialog"
        aria-labelledby="complete-payment-title"
      >
        <h3
          id="complete-payment-title"
          className="text-lg font-bold text-charcoal"
        >
          결제 완료 처리
        </h3>
        <p className="mt-1 text-sm text-muted">
          {request.member?.name ?? '회원'} · {request.label}
        </p>

        <dl className="mt-4 space-y-2 rounded-xl bg-cream/50 px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">결제 금액</dt>
            <dd className="font-bold tabular-nums">
              {formatCurrency(contractAmount)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">보유 MILE</dt>
            <dd className="font-semibold tabular-nums">
              {loadingBalance ? '…' : `${availableMiles.toLocaleString()}M`}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">최대 사용 가능</dt>
            <dd className="text-xs text-charcoal/80">
              {maxUsable.toLocaleString()}M (결제금액의 {REDEMPTION_MAX_PERCENT}
              %)
            </dd>
          </div>
        </dl>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-charcoal">
            MILE 사용 (선택)
          </span>
          <input
            type="number"
            min={0}
            max={maxUsable}
            step={1}
            value={milesInput}
            onChange={(e) => setMilesInput(e.target.value)}
            placeholder="0"
            className={inputClass}
            disabled={saving || loadingBalance || maxUsable === 0}
          />
          <p className="mt-1 text-xs text-muted">
            1M = 1원 · 실수납 예상{' '}
            <strong className="tabular-nums text-charcoal">
              {formatCurrency(cashAmount)}
            </strong>
          </p>
        </label>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`flex-1 ${btnOutline}`}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className={`flex-1 ${btnGold}`}
          >
            {saving ? '처리 중…' : '완료 처리'}
          </button>
        </div>
      </div>
    </div>
  )
}
