import { useState } from 'react'
import {
  formatCurrency,
  formatDate,
  updateMemberRemainingSessions,
} from '../../api/members'
import { updatePayment } from '../../api/payments'
import {
  btnInlineCancel,
  btnInlineSave,
  btnLink,
  btnOutline,
  btnPrimary,
  cardClass,
  inputClass,
} from '../../styles/theme'
import { getRemainingSessionsClass } from '../../utils/sessions'
import { useMemberDetail } from './MemberDetailContext'
import { PaymentFormModal } from './PaymentFormModal'
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
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [editPaidAt, setEditPaidAt] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editSessions, setEditSessions] = useState('')
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null)
  const [editingRemaining, setEditingRemaining] = useState(false)
  const [editRemaining, setEditRemaining] = useState('')
  const [savingRemaining, setSavingRemaining] = useState(false)

  if (!member) return null

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

  return (
    <div className="space-y-5">
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
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-charcoal">결제 내역</h3>
            <p className="mt-0.5 text-xs text-muted">최신순 · 수정 가능</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className={btnPrimary}
          >
            결제 등록
          </button>
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
                  <th className="px-4 py-2.5">수정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {payments.map((p) => {
                  const editing = editingPaymentId === p.id
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
    </div>
  )
}
