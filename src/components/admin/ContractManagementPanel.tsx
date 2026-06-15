import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPhone } from '../../api/members'
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TEMPLATES,
  CONTRACT_TYPE_LABELS,
  type ContractStatus,
  type ContractTemplateKey,
  type ContractType,
} from '../../constants/contractTerms'
import { fetchContracts, type ContractWithMember } from '../../api/contracts'
import { PAYMENT_CATEGORY_LABELS } from '../../constants/paymentCategories'
import { useCenterBranding } from '../../hooks/useCenterBranding'
import { ContractDraftPreviewModal } from '../contracts/ContractDraftPreviewModal'
import { ContractViewModal } from '../contracts/ContractViewModal'

type ManagementTab = 'issued' | 'drafts'

const STATUS_FILTERS: Array<{ id: 'all' | ContractStatus; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'pending_signature', label: '서명 대기' },
  { id: 'signed', label: '서명 완료' },
  { id: 'cancelled', label: '취소' },
]

const TYPE_FILTERS: Array<{ id: 'all' | ContractType; label: string }> = [
  { id: 'all', label: '전체 유형' },
  { id: 'pt_purchase', label: CONTRACT_TYPE_LABELS.pt_purchase },
  {
    id: 'center_pass_purchase',
    label: CONTRACT_TYPE_LABELS.center_pass_purchase,
  },
]

function formatWhen(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export function ContractManagementPanel() {
  const { branding } = useCenterBranding()
  const [panelTab, setPanelTab] = useState<ManagementTab>('issued')
  const [statusFilter, setStatusFilter] = useState<'all' | ContractStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ContractType>('all')
  const [contracts, setContracts] = useState<ContractWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<ContractWithMember | null>(null)
  const [draftTarget, setDraftTarget] = useState<ContractTemplateKey | null>(
    null,
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchContracts({
        status: statusFilter,
        limit: 200,
      })
      setContracts(
        typeFilter === 'all'
          ? rows
          : rows.filter((row) => row.contract_type === typeFilter),
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '계약서를 불러올 수 없습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    if (panelTab === 'issued') {
      void load()
    }
  }, [panelTab, load])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/30 bg-white p-4 text-sm text-muted">
        <p>
          <strong className="text-charcoal">발급 목록</strong>에서는 결제 요청과
          연결된 전자 계약서를 확인하고,{' '}
          <strong className="text-charcoal">계약서 초안</strong>에서는 PT 구매·
          센터이용권·PT 양도·양수 양식을 미리 볼 수 있습니다.
        </p>
        <p className="mt-2 text-xs">
          구매 계약서는 결제 요청 생성 시 자동 발급되며, 회원 앱 서명 후 결제
          완료 처리가 가능합니다. PT 양도·양수 계약서는 현재 초안 확인만
          지원합니다.
        </p>
      </div>

      <nav className="chip-scroll -mx-1 px-1">
        <button
          type="button"
          onClick={() => setPanelTab('issued')}
          className={`chip ${
            panelTab === 'issued' ? 'chip-active' : 'chip-inactive'
          }`}
        >
          발급 목록
        </button>
        <button
          type="button"
          onClick={() => setPanelTab('drafts')}
          className={`chip ${
            panelTab === 'drafts' ? 'chip-active' : 'chip-inactive'
          }`}
        >
          계약서 초안
        </button>
      </nav>

      {panelTab === 'drafts' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CONTRACT_TEMPLATES.map((template) => (
            <article
              key={template.key}
              className="flex flex-col rounded-xl border border-gold/30 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-charcoal">{template.label}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    template.category === 'transfer'
                      ? 'bg-violet-100 text-violet-800'
                      : 'bg-teal-100 text-teal-800'
                  }`}
                >
                  {template.category === 'transfer' ? '양도·양수' : '구매'}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">
                {template.description}
              </p>
              <p className="mt-3 text-xs text-charcoal/70">{template.usage}</p>
              <button
                type="button"
                onClick={() => setDraftTarget(template.key)}
                className="mt-4 text-left text-sm font-semibold text-gold-dark underline-offset-2 hover:underline"
              >
                초안 보기
              </button>
            </article>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
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
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">유형</span>
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as 'all' | ContractType)
                }
                className="rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm"
              >
                {TYPE_FILTERS.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

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
                      발급된 계약서가 없습니다.
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
        </>
      )}

      <ContractViewModal
        open={viewTarget != null}
        contract={viewTarget}
        memberName={viewTarget?.member?.name ?? undefined}
        onClose={() => setViewTarget(null)}
      />

      <ContractDraftPreviewModal
        open={draftTarget != null}
        templateKey={draftTarget}
        centerName={branding.centerName}
        onClose={() => setDraftTarget(null)}
      />
    </div>
  )
}
