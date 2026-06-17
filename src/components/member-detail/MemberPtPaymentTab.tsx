import { useEffect, useMemo, useState } from 'react'
import {
  fetchContractsByPaymentRequestIds,
  type ContractInstance,
} from '../../api/contracts'
import { CONTRACT_STATUS_LABELS } from '../../constants/contractTerms'
import { ContractViewModal } from '../contracts/ContractViewModal'
import {
  formatCurrency,
  formatDate,
  updateMemberRemainingSessions,
} from '../../api/members'
import { recalcMemberExpiry } from '../../api/period'
import { deletePayment, updatePayment } from '../../api/payments'
import {
  btnInlineCancel,
  btnInlineSave,
  btnLink,
  btnOutline,
  btnPrimary,
  cardClass,
  inputClass,
} from '../../styles/theme'
import { isFullAdmin } from '../../lib/adminPermissions'
import { getAdminSession } from '../../lib/adminSession'
import { getRemainingSessionsClass } from '../../utils/sessions'
import { useMemberDetail } from './MemberDetailContext'
import { PaymentFormModal } from './PaymentFormModal'
import { MemberPendingPaymentRequest } from './MemberPendingPaymentRequest'
import { PaymentRequestModal } from './PaymentRequestModal'
import { PtUsageBar } from './ui'

export function MemberPtPaymentTab() {
  const {
    member,
    memberId,
    payments,
    usedSessions,
    reload,
    setError,
  } = useMemberDetail()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [editPaidAt, setEditPaidAt] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editSessions, setEditSessions] = useState('')
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [editingRemaining, setEditingRemaining] = useState(false)
  const [editRemaining, setEditRemaining] = useState('')
  const [savingRemaining, setSavingRemaining] = useState(false)
  const [recalculatingExpiry, setRecalculatingExpiry] = useState(false)
  const [requestRefresh, setRequestRefresh] = useState(0)
  const [contractsByRequestId, setContractsByRequestId] = useState<
    Map<string, ContractInstance>
  >(new Map())
  const [viewContract, setViewContract] = useState<ContractInstance | null>(
    null,
  )

  const paymentRequestIds = useMemo(
    () =>
      payments
        .map((payment) => payment.payment_request_id)
        .filter((id): id is string => Boolean(id)),
    [payments],
  )

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

  if (!member) return null

  async function handleRecalcExpiry() {
    setRecalculatingExpiry(true)
    setError(null)
    try {
      await recalcMemberExpiry(memberId)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '만료일 재계산 실패')
    } finally {
      setRecalculatingExpiry(false)
    }
  }

  const remainingClass = getRemainingSessionsClass(member.remaining_sessions)

  async function handlePaymentSave(paymentId: string) {
    setSavingPaymentId(paymentId)
    setError(null)
    try {
      await updatePayment(paymentId, memberId, {
        paid_at: editPaidAt,
        amount: Number(editAmount),
        sessions: Number(editSessions),
      })
      setEditingPaymentId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 수정 실패')
    } finally {
      setSavingPaymentId(null)
    }
  }

  async function handleRemainingSave() {
    const value = Number(editRemaining)
    if (!Number.isInteger(value) || value < 0) {
      setError('잔여 횟수는 0 이상의 정수여야 합니다.')
      return
    }
    if (value > member!.total_sessions) {
      setError(
        `잔여 횟수는 등록 횟수(${member!.total_sessions}회)를 초과할 수 없습니다.`,
      )
      return
    }
    setSavingRemaining(true)
    setError(null)
    try {
      await updateMemberRemainingSessions(memberId, value)
      setEditingRemaining(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '잔여 횟수 수정 실패')
    } finally {
      setSavingRemaining(false)
    }
  }

  const needsFirstPayment = member.total_sessions === 0
  const canManagePayments = isFullAdmin(getAdminSession())

  async function handlePaymentDelete(payment: (typeof payments)[number]) {
    const sessionNote =
      payment.sessions > 0 ? `, PT ${payment.sessions}회` : ''
    if (
      !window.confirm(
        `${formatDate(payment.paid_at)} 결제 (${formatCurrency(Number(payment.amount))}${sessionNote})를 삭제할까요?\n\n삭제하면 PT 횟수·결제 합계가 조정되며 되돌릴 수 없습니다.`,
      )
    ) {
      return
    }

    setDeletingPaymentId(payment.id)
    setError(null)
    try {
      await deletePayment(payment.id, memberId)
      if (editingPaymentId === payment.id) {
        setEditingPaymentId(null)
      }
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 삭제 실패')
    } finally {
      setDeletingPaymentId(null)
    }
  }

  return (
    <div className="space-y-5">
      {needsFirstPayment && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 sm:px-5">
          <p className="text-sm font-semibold text-sky-900">
            자가가입 회원 — 첫 PT 등록이 필요합니다
          </p>
          <p className="mt-1 text-sm text-sky-800/90">
            아래 「결제 등록」에서 결제 금액과 PT 횟수를 입력하세요.
          </p>
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className={`mt-3 ${btnPrimary}`}
          >
            첫 결제 등록
          </button>
        </div>
      )}

      <section className={`${cardClass} card-pad`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-charcoal">PT 정보</h3>
          {!editingRemaining && (
            <button
              type="button"
              onClick={() => {
                setEditRemaining(String(member.remaining_sessions))
                setEditingRemaining(true)
              }}
              className={btnLink}
            >
              잔여 횟수 수정
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-cream/70 px-3 py-3 text-center">
            <p className="text-xs text-charcoal/50">등록</p>
            <p className="mt-1 text-2xl font-bold text-charcoal tabular-nums">
              {member.total_sessions}
            </p>
          </div>
          <div className="rounded-xl bg-cream/70 px-3 py-3 text-center">
            <p className="text-xs text-charcoal/50">사용</p>
            <p className="mt-1 text-2xl font-bold text-charcoal tabular-nums">
              {usedSessions}
            </p>
          </div>
          <div className="rounded-xl bg-cream/70 px-3 py-3 text-center">
            <p className="text-xs text-charcoal/50">잔여</p>
            {editingRemaining ? (
              <input
                type="number"
                min={0}
                max={member.total_sessions}
                value={editRemaining}
                onChange={(e) => setEditRemaining(e.target.value)}
                className={`${inputClass} mt-1 !py-1.5 text-center text-lg font-bold`}
              />
            ) : (
              <p
                className={`mt-1 text-2xl font-bold tabular-nums ${remainingClass}`}
              >
                {member.remaining_sessions}
              </p>
            )}
          </div>
        </div>
        {editingRemaining && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingRemaining}
              onClick={() => void handleRemainingSave()}
              className={btnPrimary}
            >
              {savingRemaining ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => setEditingRemaining(false)}
              className={btnOutline}
            >
              취소
            </button>
          </div>
        )}
        <PtUsageBar used={usedSessions} total={member.total_sessions} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gold/15 pt-3 text-sm">
          <span className="text-muted">
            만료일:{' '}
            <strong className="text-charcoal">
              {formatDate(member.expires_at)}
            </strong>
            <span className="ml-1 text-xs">
              (최신 결제일 + 해당 PT 횟수 기준)
            </span>
          </span>
          <button
            type="button"
            onClick={() => void handleRecalcExpiry()}
            disabled={recalculatingExpiry || payments.length === 0}
            className={btnLink}
          >
            {recalculatingExpiry ? '재계산 중…' : '만료일 재계산'}
          </button>
        </div>
      </section>

      <MemberPendingPaymentRequest
        memberId={memberId}
        refreshToken={requestRefresh}
        onError={setError}
        onChanged={() => setRequestRefresh((value) => value + 1)}
      />

      <section className={`${cardClass} overflow-hidden`}>
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-charcoal">결제 내역</h3>
            <p className="mt-0.5 text-xs text-muted">
              최신순 · 수정 가능
              {canManagePayments ? ' · 관리자 삭제 가능' : ''}
              {' · '}결제 요청 건은 계약서 보기·인쇄
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className={btnOutline}
            >
              결제 요청 (PT·이용권·라커)
            </button>
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className={btnPrimary}
            >
              결제 등록
            </button>
          </div>
        </div>
        {payments.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">
            결제 내역이 없습니다. 상단 「결제 등록」으로 추가하세요.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2.5">결제일</th>
                  <th className="px-4 py-2.5">결제금액</th>
                  <th className="px-4 py-2.5">PT 횟수</th>
                  <th className="px-4 py-2.5">계약서</th>
                  <th className="px-4 py-2.5">수정</th>
                  {canManagePayments && (
                    <th className="px-4 py-2.5">삭제</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {payments.map((p) => {
                  const editing = editingPaymentId === p.id
                  const contract = p.payment_request_id
                    ? contractsByRequestId.get(p.payment_request_id)
                    : undefined
                  return (
                    <tr key={p.id} className="hover:bg-cream/40">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editing ? (
                          <input
                            type="date"
                            value={editPaidAt}
                            onChange={(e) => setEditPaidAt(e.target.value)}
                            className={`${inputClass} !py-1.5 text-xs`}
                          />
                        ) : (
                          formatDate(p.paid_at)
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editing ? (
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className={`${inputClass} !w-28 !py-1.5 text-xs`}
                          />
                        ) : (
                          <span className="font-medium tabular-nums">
                            {formatCurrency(Number(p.amount))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {editing ? (
                          <input
                            type="number"
                            min={0}
                            value={editSessions}
                            onChange={(e) => setEditSessions(e.target.value)}
                            className={`${inputClass} !w-20 !py-1.5 text-xs`}
                          />
                        ) : (
                          `${p.sessions}회`
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {contract ? (
                          <button
                            type="button"
                            onClick={() => setViewContract(contract)}
                            className={btnLink}
                          >
                            {contract.status === 'signed'
                              ? '보기·인쇄'
                              : CONTRACT_STATUS_LABELS[contract.status]}
                          </button>
                        ) : p.payment_request_id ? (
                          <span className="text-xs text-muted">없음</span>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editing ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={savingPaymentId === p.id}
                              onClick={() => void handlePaymentSave(p.id)}
                              className={btnInlineSave}
                            >
                              {savingPaymentId === p.id ? '…' : '저장'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPaymentId(null)}
                              className={btnInlineCancel}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPaymentId(p.id)
                              setEditPaidAt(String(p.paid_at).slice(0, 10))
                              setEditAmount(String(p.amount))
                              setEditSessions(String(p.sessions))
                            }}
                            className={btnLink}
                          >
                            수정
                          </button>
                        )}
                      </td>
                      {canManagePayments && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={
                              deletingPaymentId === p.id ||
                              editingPaymentId === p.id
                            }
                            onClick={() => void handlePaymentDelete(p)}
                            className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                          >
                            {deletingPaymentId === p.id ? '삭제 중…' : '삭제'}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PaymentFormModal
        memberId={memberId}
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={reload}
        onError={setError}
      />
      <PaymentRequestModal
        memberId={memberId}
        memberName={member.name}
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={async () => {
          setRequestRefresh((value) => value + 1)
          await reload()
        }}
        onError={setError}
      />
      <ContractViewModal
        open={viewContract != null}
        contract={viewContract}
        memberName={member.name}
        onClose={() => setViewContract(null)}
      />
    </div>
  )
}
