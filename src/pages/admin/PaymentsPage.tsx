import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatCurrency, formatPhone } from '../../api/members'
import {
  enabledPaymentCategories,
  fetchPaymentCategoryFlags,
} from '../../api/paymentCategorySettings'
import {
  CONTRACT_STATUS_LABELS,
} from '../../constants/contractTerms'
import {
  ensureContractsForPaymentRequests,
  fetchContractsByPaymentRequestIds,
  type ContractInstance,
} from '../../api/contracts'
import {
  cancelPaymentRequest,
  completePaymentRequestManually,
  fetchPaymentRequests,
  formatDiscountSummary,
  type PaymentRequestWithMember,
} from '../../api/paymentRequests'
import { CompletePaymentModal } from '../../components/admin/CompletePaymentModal'
import { ContractManagementPanel } from '../../components/admin/ContractManagementPanel'
import { PaymentCategoryPricingPanel } from '../../components/admin/PaymentCategoryPricingPanel'
import { PageHeader } from '../../components/admin/PageHeader'
import { PAGE_HELP } from '../../lib/pageHelpTips'
import {
  PAYMENT_CATEGORIES,
  PAYMENT_CATEGORY_LABELS,
  type PaymentCategory,
} from '../../constants/paymentCategories'
import type { PaymentCategoryFlags } from '../../types/paymentCategorySettings'
import { PAYMENT_REQUEST_STATUS_LABELS } from '../../constants/pricing'
import { formatPaymentRequestDetail } from '../../lib/paymentRequestDisplay'
import type { PaymentRequestStatus } from '../../types/database'

type AdminTab = 'pricing' | 'requests' | 'contracts'

const ADMIN_TABS: AdminTab[] = ['pricing', 'requests', 'contracts']

function parseAdminTab(value: string | null): AdminTab {
  if (value && ADMIN_TABS.includes(value as AdminTab)) {
    return value as AdminTab
  }
  return 'pricing'
}

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
  if (value && (PAYMENT_CATEGORIES as readonly string[]).includes(value)) {
    return value as PaymentCategory
  }
  return 'pt'
}

export default function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightRequestId = searchParams.get('requestId')
  const pricingCategory = parsePricingCategory(searchParams.get('category'))
  const adminTab = parseAdminTab(searchParams.get('tab'))
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentRequestStatus>(
    'pending',
  )
  const [categoryFilter, setCategoryFilter] = useState<PaymentCategory | 'all'>(
    'all',
  )
  const [requests, setRequests] = useState<PaymentRequestWithMember[]>([])
  const [contracts, setContracts] = useState<Map<string, ContractInstance>>(
    new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [completeTarget, setCompleteTarget] =
    useState<PaymentRequestWithMember | null>(null)
  const [categoryFlags, setCategoryFlags] = useState<PaymentCategoryFlags | null>(
    null,
  )

  const visibleCategories = categoryFlags
    ? enabledPaymentCategories(categoryFlags)
    : PAYMENT_CATEGORIES

  useEffect(() => {
    void fetchPaymentCategoryFlags().then(setCategoryFlags).catch(() => {})
  }, [])

  useEffect(() => {
    if (!highlightRequestId) return
    if (searchParams.get('tab') === 'requests') {
      setStatusFilter('all')
      return
    }
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'requests')
    setSearchParams(next, { replace: true })
    setStatusFilter('all')
  }, [highlightRequestId, searchParams, setSearchParams])

  function setAdminTab(tab: AdminTab) {
    const next = new URLSearchParams(searchParams)
    if (tab === 'pricing') {
      next.delete('tab')
    } else {
      next.set('tab', tab)
    }
    setSearchParams(next, { replace: true })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchPaymentRequests({
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter,
        limit: 100,
      })
      setRequests(rows)
      const contractMap = await fetchContractsByPaymentRequestIds(
        rows.map((row) => row.id),
      )
      const pendingRows = rows.filter((row) => row.status === 'pending')
      if (pendingRows.length > 0) {
        const ensured = await ensureContractsForPaymentRequests(pendingRows)
        for (const [id, contract] of ensured) {
          contractMap.set(id, contract)
        }
      }
      setContracts(contractMap)
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

  async function handleCompleteConfirm(options: {
    milesToUse: number
    startsAt?: string
  }) {
    if (!completeTarget) return
    setActionId(completeTarget.id)
    setToast(null)
    setError(null)
    try {
      await completePaymentRequestManually(completeTarget.id, options)
      setToast(
        options.milesToUse > 0
          ? `결제 완료 (MILE ${options.milesToUse.toLocaleString()}M 사용)`
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
        description="상품·가격 설정과 회원별 결제 요청, 계약서·오프라인 완료 처리 및 MILE 사용을 관리합니다."
        helpText={PAGE_HELP.payments}
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
        <button
          type="button"
          onClick={() => setAdminTab('contracts')}
          className={`chip ${adminTab === 'contracts' ? 'chip-active' : 'chip-inactive'}`}
        >
          계약서 관리
        </button>
      </nav>

      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      )}
      {error && adminTab !== 'requests' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {adminTab === 'contracts' ? (
        <ContractManagementPanel />
      ) : adminTab === 'pricing' ? (
        <PaymentCategoryPricingPanel
          initialCategory={pricingCategory}
          onCategoryChange={(category) => {
            setSearchParams({ category }, { replace: true })
          }}
          onPaymentRequestToast={setToast}
          onPaymentRequestError={setError}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">항목</span>
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as PaymentCategory | 'all')
                }
                className="rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm"
              >
                <option value="all">전체</option>
                {visibleCategories.map((category) => (
                  <option key={category} value={category}>
                    {PAYMENT_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>
            <nav className="chip-scroll -mx-1 flex-1 px-1">
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
          </div>

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
                  <th className="px-4 py-3 font-semibold">계약서</th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="px-4 py-3 font-semibold">처리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                      불러오는 중…
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                      결제 요청이 없습니다.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => {
                    const discount = formatDiscountSummary(request)
                    const busy = actionId === request.id
                    const contract = contracts.get(request.id)
                    return (
                      <tr
                        key={request.id}
                        className={`border-b border-gold/10 ${
                          highlightRequestId === request.id
                            ? 'bg-amber-50 ring-2 ring-amber-300 ring-inset'
                            : ''
                        }`}
                      >
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
                          {contract ? (
                            <span
                              className={
                                contract.status === 'signed'
                                  ? 'font-semibold text-emerald-700'
                                  : 'font-semibold text-amber-700'
                              }
                            >
                              {CONTRACT_STATUS_LABELS[contract.status]}
                            </span>
                          ) : request.status === 'pending' ? (
                            <span className="text-muted">생성 대기</span>
                          ) : (
                            '-'
                          )}
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
