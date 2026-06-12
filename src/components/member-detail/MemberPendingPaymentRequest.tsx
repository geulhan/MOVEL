import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../../api/members'
import {
  cancelPaymentRequest,
  fetchMemberPendingPaymentRequests,
  formatDiscountSummary,
} from '../../api/paymentRequests'
import { PAYMENT_CATEGORY_LABELS } from '../../constants/paymentCategories'
import { PAYMENT_REQUEST_EXPIRY_DAYS } from '../../constants/pricing'
import { formatPaymentRequestDetail } from '../../lib/paymentRequestDisplay'
import type { PaymentRequest } from '../../types/database'
import { btnOutline, cardClass } from '../../styles/theme'

type Props = {
  memberId: string
  refreshToken?: number
  onError: (message: string | null) => void
  onChanged?: () => void
}

function formatExpires(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export function MemberPendingPaymentRequest({
  memberId,
  refreshToken,
  onError,
  onChanged,
}: Props) {
  const [pending, setPending] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setPending(await fetchMemberPendingPaymentRequests(memberId))
    } catch (err) {
      onError(
        err instanceof Error ? err.message : '결제 요청을 불러올 수 없습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [memberId, onError])

  useEffect(() => {
    void load()
  }, [load, refreshToken])

  async function handleCancel(requestId: string) {
    if (
      !window.confirm(
        '대기 중인 결제 요청을 취소할까요?\n회원 앱 결제 탭에서도 사라집니다.',
      )
    ) {
      return
    }

    setCancellingId(requestId)
    try {
      await cancelPaymentRequest(requestId)
      setPending((prev) => prev.filter((row) => row.id !== requestId))
      onChanged?.()
    } catch (err) {
      onError(err instanceof Error ? err.message : '결제 요청 취소 실패')
    } finally {
      setCancellingId(null)
    }
  }

  if (loading || pending.length === 0) return null

  return (
    <div className="space-y-3">
      {pending.map((request) => {
        const discount = formatDiscountSummary(request)
        const category = request.category ?? 'pt'
        const busy = cancellingId === request.id

        return (
          <section
            key={request.id}
            className={`${cardClass} border-amber-200 bg-amber-50/60 p-5`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  결제 요청 대기 · {PAYMENT_CATEGORY_LABELS[category]}
                </p>
                <h3 className="mt-1 text-lg font-bold text-charcoal">
                  {request.label}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {formatPaymentRequestDetail(request)}
                </p>
              </div>
              <div className="text-right">
                {request.discount_amount > 0 && (
                  <p className="text-sm text-muted line-through">
                    {formatCurrency(Number(request.list_amount))}
                  </p>
                )}
                <p className="text-xl font-bold tabular-nums text-charcoal">
                  {formatCurrency(Number(request.amount))}
                </p>
              </div>
            </div>

            {discount && (
              <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-emerald-800">
                {discount}
              </p>
            )}

            <p className="mt-2 text-xs text-muted">
              결제 기한: {formatExpires(request.expires_at)} (
              {PAYMENT_REQUEST_EXPIRY_DAYS}일) · 회원 앱 결제 탭에 표시됨
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCancel(request.id)}
                disabled={busy}
                className={btnOutline}
              >
                {busy ? '취소 중…' : '결제 요청 취소'}
              </button>
              <Link
                to="/admin/payments"
                className="self-center text-xs font-semibold text-charcoal hover:underline"
              >
                결제 관리에서 완료 처리 →
              </Link>
            </div>
          </section>
        )
      })}
    </div>
  )
}
