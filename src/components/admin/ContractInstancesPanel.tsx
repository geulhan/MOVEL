import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPhone } from '../../api/members'
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  type ContractStatus,
} from '../../constants/contractTerms'
import { fetchContracts, type ContractWithMember } from '../../api/contracts'
import { PAYMENT_CATEGORY_LABELS } from '../../constants/paymentCategories'
import { ContractViewModal } from '../contracts/ContractViewModal'

const STATUS_FILTERS: Array<{ id: 'all' | ContractStatus; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'pending_signature', label: '서명 대기' },
  { id: 'signed', label: '서명 완료' },
  { id: 'cancelled', label: '취소' },
]

function formatWhen(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export function ContractInstancesPanel() {
  const [statusFilter, setStatusFilter] = useState<'all' | ContractStatus>('all')
  const [contracts, setContracts] = useState<ContractWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<ContractWithMember | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setContracts(
        await fetchContracts({
          status: statusFilter,
          limit: 100,
        }),
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '계약서를 불러올 수 없습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/30 bg-white p-4 text-sm text-muted">
        결제 요청 생성 시 계약서가 자동으로 만들어집니다. 회원이 앱에서 서명한
        뒤에만 결제 완료 처리가 가능합니다. 환불 약관은 계약서에 필수로
        포함됩니다.
      </div>

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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <p className="mt-1 text-xs">
            Supabase에서 migration_029_contracts.sql을 실행했는지 확인하세요.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gold/30 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gold/20 bg-cream/60 text-left text-xs text-muted">
              <th className="px-4 py-3 font-semibold">생성일</th>
              <th className="px-4 py-3 font-semibold">유형</th>
              <th className="px-4 py-3 font-semibold">회원</th>
              <th className="px-4 py-3 font-semibold">결제 요청</th>
              <th className="px-4 py-3 font-semibold">상태</th>
              <th className="px-4 py-3 font-semibold">서명</th>
              <th className="px-4 py-3 font-semibold">보기</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  불러오는 중…
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  계약서가 없습니다.
                </td>
              </tr>
            ) : (
              contracts.map((contract) => (
                <tr key={contract.id} className="border-b border-gold/10">
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {formatWhen(contract.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold">
                    {CONTRACT_TYPE_LABELS[contract.contract_type]}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {contract.member ? (
                      <>
                        <Link
                          to={`/admin/member/${contract.member_id}/pt`}
                          className="font-medium text-charcoal underline-offset-2 hover:underline"
                        >
                          {contract.member.name}
                        </Link>
                        <p className="font-mono text-[10px] text-muted">
                          {formatPhone(contract.member.phone)}
                        </p>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {contract.payment_request?.label ?? '-'}
                    </p>
                    {contract.payment_request?.category && (
                      <p className="text-xs text-muted">
                        {
                          PAYMENT_CATEGORY_LABELS[
                            contract.payment_request.category
                          ]
                        }
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        contract.status === 'signed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : contract.status === 'pending_signature'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {CONTRACT_STATUS_LABELS[contract.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted">
                    {formatWhen(contract.signed_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setViewTarget(contract)}
                      className="text-xs font-semibold text-gold-dark underline-offset-2 hover:underline"
                    >
                      계약서
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ContractViewModal
        open={viewTarget != null}
        contract={viewTarget}
        memberName={viewTarget?.member?.name ?? undefined}
        onClose={() => setViewTarget(null)}
      />
    </div>
  )
}
