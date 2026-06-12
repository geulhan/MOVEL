import { useCallback, useEffect, useState } from 'react'
import { formatCurrency } from '../../api/members'
import {
  fetchMemberPendingPaymentRequests,
  formatDiscountSummary,
} from '../../api/paymentRequests'
import { fetchPtPricing, getActivePackages } from '../../api/pricing'
import {
  calcMaxRedeemableMiles,
  fetchRewardBalance,
} from '../../api/rewards'
import { PAYMENT_CATEGORY_LABELS } from '../../constants/paymentCategories'
import { PAYMENT_REQUEST_EXPIRY_DAYS } from '../../constants/pricing'
import { REDEMPTION_MAX_PERCENT } from '../../constants/rewards'
import {
  formatPaymentRequestDetail,
  paymentRequestFulfillmentHint,
} from '../../lib/paymentRequestDisplay'
import type { PaymentRequest } from '../../types/database'
import { cardClass } from '../../styles/theme'

type Props = {
  memberId: string
}

function formatExpires(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export function MemberPaymentSection({ memberId }: Props) {
  const [pending, setPending] = useState<PaymentRequest[]>([])
  const [catalogAmount, setCatalogAmount] = useState<number | null>(null)
  const [availableMiles, setAvailableMiles] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [requests, pricing, balance] = await Promise.all([
        fetchMemberPendingPaymentRequests(memberId),
        fetchPtPricing(),
        fetchRewardBalance(memberId),
      ])
      setPending(requests)
      setAvailableMiles(balance.move_mile)
      const active = getActivePackages(pricing)
      setCatalogAmount(active[0]?.amount ?? null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '결제 정보를 불러올 수 없습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <p className="text-sm text-muted">불러오는 중…</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {pending.length === 0 ? (
        <section className={`${cardClass} p-5`}>
          <h3 className="text-base font-semibold text-charcoal">결제 요청</h3>
          <p className="mt-2 text-sm text-muted">
            현재 대기 중인 결제 요청이 없습니다. PT · 센터 이용권 · 라커·수건
            결제는 센터에 문의해 주세요.
          </p>
          {catalogAmount != null && (
            <p className="mt-3 text-xs text-muted">
              PT 기본 패키지 예시: {formatCurrency(catalogAmount)}부터
            </p>
          )}
        </section>
      ) : (
        pending.map((request) => {
          const discount = formatDiscountSummary(request)
          const amount = Number(request.amount)
          const maxMiles = calcMaxRedeemableMiles(amount, availableMiles)
          const minCash = amount - maxMiles
          const category = request.category ?? 'pt'
          return (
            <section key={request.id} className={`${cardClass} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
                    결제 요청 · {PAYMENT_CATEGORY_LABELS[category]}
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
                  <p className="text-xl font-bold text-charcoal tabular-nums">
                    {formatCurrency(Number(request.amount))}
                  </p>
                </div>
              </div>

              {discount && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {discount}
                </p>
              )}

              {request.expires_at && (
                <p className="mt-2 text-xs text-muted">
                  결제 기한: {formatExpires(request.expires_at)} (
                  {PAYMENT_REQUEST_EXPIRY_DAYS}일)
                </p>
              )}

              <div className="mt-4 rounded-xl border border-gold/30 bg-cream/50 px-4 py-3 text-sm text-charcoal">
                <p className="font-semibold">센터 결제 안내</p>
                <p className="mt-1 text-muted">
                  센터 방문 또는 안내받은 계좌로 입금해 주세요. 확인 후{' '}
                  {paymentRequestFulfillmentHint(category)}
                </p>
                {maxMiles > 0 && (
                  <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-xs text-charcoal">
                    MOVE MILE 최대{' '}
                    <strong className="tabular-nums">
                      {maxMiles.toLocaleString()}M
                    </strong>
                    까지 사용 가능 (결제금액의 {REDEMPTION_MAX_PERCENT}%).
                    결제 시 센터에 말씀해 주시면 반영됩니다.
                    {minCash < amount && (
                      <>
                        {' '}
                        최소 실수납{' '}
                        <strong className="tabular-nums">
                          {formatCurrency(minCash)}
                        </strong>
                      </>
                    )}
                  </p>
                )}
              </div>
            </section>
          )
        })
      )}

      <section className="rounded-xl border border-dashed border-gold/40 bg-white/60 px-4 py-3 text-xs text-muted">
        결제·할인·MILE 사용은 센터에서 최종 확인 후 반영됩니다.
      </section>
    </div>
  )
}
