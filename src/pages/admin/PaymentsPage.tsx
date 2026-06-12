import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatCurrency, formatPhone } from '../../api/members'
import {
  cancelPaymentRequest,
  completePaymentRequestManually,
  fetchPaymentRequests,
  formatDiscountSummary,
  type PaymentRequestWithMember,
} from '../../api/paymentRequests'
import { CompletePaymentModal } from '../../components/admin/CompletePaymentModal'
import { PaymentCategoryPricingPanel } from '../../components/admin/PaymentCategoryPricingPanel'
import { PageHeader } from '../../components/admin/PageHeader'
import {
  PAYMENT_CATEGORIES,
  PAYMENT_CATEGORY_LABELS,
  type PaymentCategory,
} from '../../constants/paymentCategories'
import { PAYMENT_REQUEST_STATUS_LABELS } from '../../constants/pricing'
import { formatPaymentRequestDetail } from '../../lib/paymentRequestDisplay'
import type { PaymentRequestStatus } from '../../types/database'

type AdminTab = 'pricing' | 'requests'

const STATUS_FILTERS: Array<{ id: 'all' | PaymentRequestStatus; label: string }> =
  [
    { id: 'all', label: '전체' },
    { id: 'pending', label: '결제 대기' },
    { id: 'paid', label: '완료' },
    { id: 'cancelled', label: '취소' },
    { id: 'expired', label: '만료' },
  ]

function formatWhen(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

function parsePricingCategory(value: string | null): PaymentCategory {
  if (value === 'center_pass' || value === 'locker_towel' || value === 'pt') {
    return value
  }
  return 'pt'
}

export default function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const pricingCategory = parsePricingCategory(searchParams.get('category'))
  const [adminTab, setAdminTab] = useState<AdminTab>('pricing')
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentRequestStatus>(
    'pending',
  )
  const [categoryFilter, setCategoryFilter] = useState<PaymentCategory | 'all'>(
    'all',
  )
  const [requests, setRequests] = useState<PaymentRequestWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [completeTarget, setCompleteTarget] =
    useState<PaymentRequestWithMember | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRequests(
        await fetchPaymentRequests({
          status: statusFilter === 'all' ? undefined : statusFilter,
          category: categoryFilter,
          limit: 100,
        }),
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '결제 요청을 불러올 수 없습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter])

  useEffect(() => {
    if (adminTab === 'requests') {
      void load()
    }
  }, [adminTab, load])

  async function handleCompleteConfirm(milesToUse: number) {
    if (!completeTarget) return
    setActionId(completeTarget.id)
    setToast(null)
    setError(null)
    try {
      await completePaymentRequestManually(completeTarget.id, { milesToUse })
      setToast(
        milesToUse > 0
          ? `결제 완료 (MILE ${milesToUse.toLocaleString()}M 사용)`
          : '결제가 완료 처리되었습니다.',
      )
      setCompleteTarget(null)
      await load()
    } catch (err) {
      throw err
    } finally {
      setActionId(null)
    }
  }

  async function handleCancel(requestId: string) {
    if (!window.confirm('이 결제 요청을 취소할까요?')) return
    setActionId(requestId)
    try {
      await cancelPaymentRequest(requestId)
      setToast('결제 요청이 취소되었습니다.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '취소 실패')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="결제 관리"
        description="PT · 센터 이용권 · 라커·수건 상품 설정, 결제 요청(할인), 오프라인 완료 처리 및 MILE 사용을 관리합니다."
      />

      <nav className="chip-scroll -mx-1 px-1">
        <button
          type="button"
          onClick={() => setAdminTab('pricing')}
          className={`chip ${adminTab === 'pricing' ? 'chip-active' : 'chip-inactive'}`}
        >
          상품 · 가격
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('requests')}
          className={`chip ${adminTab === 'requests' ? 'chip-active' : 'chip-inactive'}`}
        >
          결제 요청
        </button>
      </nav>

      {adminTab === 'pricing' ? (
        <PaymentCategoryPricingPanel
          initialCategory={pricingCategory}
          onCategoryChange={(category) => {
            setSearchParams({ category }, { replace: true })
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-gold/30 bg-white p-4 text-sm text-muted">
            회원 상세 → PT·결제 탭에서 카테고리별 「결제 요청 보내기」로
            할인가를 포함한 요청을 보낼 수 있습니다. 회원 앱 결제 탭에서
            확인합니다.
          </div>

          <nav className="chip-scroll -mx-1 px-1">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`chip ${
                categoryFilter === 'all' ? 'chip-active' : 'chip-inactive'
              }`}
            >
              전체 항목
            </button>
            {PAYMENT_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={`chip ${
                  categoryFilter === category ? 'chip-active' : 'chip-inactive'
                }`}
              >
                {PAYMENT_CATEGORY_LABELS[category]}
              </button>
            ))}
          </nav>

          <nav className="chip-scroll -mx-1 px-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`chip ${
                  statusFilter === filter.id ? 'chip-active' : 'chip-inactive'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </nav>

          {toast && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {toast}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              <p className="mt-1 text-xs">
                Supabase에서 migration_020_payment_system.sql을 실행했는지
                확인하세요.
              </p>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gold/30 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gold/20 bg-cream/60 text-left text-xs text-muted">
                  <th className="px-4 py-3 font-semibold">요청일</th>
                  <th className="px-4 py-3 font-semibold">항목</th>
                  <th className="px-4 py-3 font-semibold">회원</th>
                  <th className="px-4 py-3 font-semibold">내용</th>
                  <th className="px-4 py-3 font-semibold">금액</th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="px-4 py-3 font-semibold">처리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                      불러오는 중…
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                      결제 요청이 없습니다.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => {
                    const discount = formatDiscountSummary(request)
                    const busy = actionId === request.id
                    return (
                      <tr key={request.id} className="border-b border-gold/10">
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          {formatWhen(request.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold">
                          {PAYMENT_CATEGORY_LABELS[request.category ?? 'pt']}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {request.member ? (
                            <Link
                              to={`/admin/member/${request.member_id}/pt`}
                              className="font-medium text-charcoal underline-offset-2 hover:underline"
                            >
                              {request.member.name}
                            </Link>
                          ) : (
                            '-'
                          )}
                          <p className="font-mono text-[10px] text-muted">
                            {request.member
                              ? formatPhone(request.member.phone)
                              : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{request.label}</p>
                          <p className="text-xs text-muted">
                            {formatPaymentRequestDetail(request)}
                            {discount && ` · ${discount}`}
                          </p>
                          {request.expires_at && request.status === 'pending' && (
                            <p className="text-[10px] text-amber-700">
                              만료 {formatWhen(request.expires_at)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {request.discount_amount > 0 && (
                            <p className="text-xs text-muted line-through">
                              {formatCurrency(Number(request.list_amount))}
                            </p>
                          )}
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(Number(request.amount))}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          {PAYMENT_REQUEST_STATUS_LABELS[request.status]}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {request.status === 'pending' ? (
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setCompleteTarget(request)}
                                className="text-left text-xs font-semibold text-charcoal hover:underline disabled:opacity-50"
                              >
                                {busy ? '처리 중…' : '결제 완료 처리'}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleCancel(request.id)}
                                className="text-left text-xs text-red-600 hover:underline disabled:opacity-50"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CompletePaymentModal
        request={completeTarget}
        open={completeTarget != null}
        saving={actionId === completeTarget?.id}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleCompleteConfirm}
      />
    </div>
  )
}
