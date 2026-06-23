import { useEffect, useMemo, useState } from 'react'
import {
  fetchContractsByPaymentRequestIds,
  type ContractInstance,
} from '../../api/contracts'
import { fetchMemberPaymentHistory } from '../../api/memberPortal'
import { formatCurrency, formatDate } from '../../api/members'
import { PAYMENT_CATEGORY_LABELS } from '../../constants/paymentCategories'
import { btnLink, cardClass } from '../../styles/theme'
import type { PaymentHistory } from '../../types/database'
import { MemberContractSignModal } from '../contracts/MemberContractSignModal'

type Props = {
  memberId: string
  compact?: boolean
}

export function MemberPaymentHistorySection({
  memberId,
  compact = false,
}: Props) {
  const [rows, setRows] = useState<PaymentHistory[]>([])
  const [contractsByRequestId, setContractsByRequestId] = useState<
    Map<string, ContractInstance>
  >(new Map())
  const [viewContract, setViewContract] = useState<ContractInstance | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paymentRequestIds = useMemo(
    () =>
      rows
        .map((row) => row.payment_request_id)
        .filter((id): id is string => Boolean(id)),
    [rows],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const data = await fetchMemberPaymentHistory(memberId)
        if (!cancelled) {
          setRows(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '결제 내역을 불러올 수 없습니다.')
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [memberId])

  useEffect(() => {
    if (paymentRequestIds.length === 0) {
      setContractsByRequestId(new Map())
      return
    }

    let cancelled = false
    void fetchContractsByPaymentRequestIds(paymentRequestIds).then((map) => {
      if (!cancelled) setContractsByRequestId(map)
    })

    return () => {
      cancelled = true
    }
  }, [paymentRequestIds])

  return (
    <>
      <section className={`${cardClass} ${compact ? 'p-5' : 'p-6'}`}>
        <h3 className={`member-section-title ${compact ? 'text-base' : ''}`}>
          결제 내역
        </h3>
        <p className="member-section-desc">
          센터에서 완료된 결제 기록과 서명한 계약서를 확인합니다.
        </p>

        {loading && <p className="mt-4 text-sm text-muted">불러오는 중…</p>}
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <p className="mt-4 text-sm text-muted">결제 내역이 없습니다.</p>
        )}

        {!loading && rows.length > 0 && (
          <div className="mt-4 table-scroll">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-2">결제일</th>
                  <th className="px-3 py-2">구분</th>
                  <th className="px-3 py-2">금액</th>
                  <th className="px-3 py-2">계약서</th>
                  <th className="px-3 py-2">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {rows.map((row) => {
                  const contract = row.payment_request_id
                    ? contractsByRequestId.get(row.payment_request_id)
                    : undefined
                  const canViewContract = contract?.status === 'signed'

                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums text-muted">
                        {formatDate(row.paid_at)}
                      </td>
                      <td className="px-3 py-3">
                        {PAYMENT_CATEGORY_LABELS[row.category ?? 'pt']}
                        {row.category === 'pt' && row.sessions > 0
                          ? ` · ${row.sessions}회`
                          : ''}
                      </td>
                      <td className="px-3 py-3 font-medium tabular-nums">
                        {formatCurrency(Number(row.amount))}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {canViewContract ? (
                          <button
                            type="button"
                            onClick={() => setViewContract(contract)}
                            className={btnLink}
                          >
                            보기
                          </button>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-3 text-muted">
                        {row.note || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <MemberContractSignModal
        open={viewContract != null}
        contract={viewContract}
        memberId={memberId}
        onClose={() => setViewContract(null)}
        onSigned={() => {}}
      />
    </>
  )
}
