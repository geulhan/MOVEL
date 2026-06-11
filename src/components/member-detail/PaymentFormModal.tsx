import { useState, type FormEvent } from 'react'
import { todayDateString } from '../../api/members'
import { createMemberPayment } from '../../api/payments'
import { btnOutline, btnPrimary, inputClass } from '../../styles/theme'

type Props = {
  memberId: string
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  onError: (message: string) => void
}

export function PaymentFormModal({
  memberId,
  open,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [paidAt, setPaidAt] = useState(todayDateString())
  const [amount, setAmount] = useState('')
  const [sessions, setSessions] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  function resetForm() {
    setPaidAt(todayDateString())
    setAmount('')
    setSessions('')
    setNote('')
  }

  function handleClose() {
    if (saving) return
    resetForm()
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsedAmount = Number(amount.replace(/,/g, ''))
    const parsedSessions = Number(sessions)

    if (!paidAt) {
      onError('결제일을 입력해 주세요.')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      onError('결제 금액을 올바르게 입력해 주세요.')
      return
    }
    if (!Number.isInteger(parsedSessions) || parsedSessions < 1) {
      onError('PT 횟수는 1 이상의 정수여야 합니다.')
      return
    }

    setSaving(true)
    try {
      await createMemberPayment(memberId, {
        amount: parsedAmount,
        sessions: parsedSessions,
        paid_at: paidAt,
        note: note.trim() || '추가 결제',
      })
      resetForm()
      onClose()
      await onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : '결제 등록 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="닫기"
        onClick={handleClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gold/30 bg-white p-5 shadow-xl sm:p-6">
        <h3
          id="payment-modal-title"
          className="text-lg font-semibold text-charcoal"
        >
          결제 등록
        </h3>
        <p className="mt-1 text-sm text-muted">
          PT 횟수가 반영되고 결제 완료 알림이 발송됩니다. (템플릿 승인 후)
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">
              결제일
            </span>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className={inputClass}
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">
              결제 금액 (원)
            </span>
            <input
              type="number"
              min={0}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={inputClass}
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">
              PT 횟수
            </span>
            <input
              type="number"
              min={1}
              value={sessions}
              onChange={(e) => setSessions(e.target.value)}
              placeholder="10"
              className={inputClass}
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">
              메모
            </span>
            <input
              type="text"
              lang="ko"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="추가 결제"
              className={inputClass}
              disabled={saving}
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 ${btnPrimary}`}
            >
              {saving ? '등록 중…' : '등록'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className={btnOutline}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
