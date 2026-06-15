import { useMemo, useState, type FormEvent } from 'react'
import { createMember, formatDate, todayDateString } from '../api/members'
import { getErrorMessage } from '../lib/errors'
import { SESSION_DAYS_PER_SESSION } from '../constants/session'
import { btnPrimary, cardClass, inputClass } from '../styles/theme'
import {
  MEMBER_STATUS_LABELS,
  type Member,
  type MemberStatus,
  type Trainer,
} from '../types/database'
import { calcSessionExpiry, formatSessionPeriodHint } from '../utils/period'
import {
  PhoneInput,
  phoneBodyToFull,
  validatePhoneBody,
} from './PhoneInput'

type Props = {
  trainers: Trainer[]
  members?: Member[]
  onCreated: () => void
}

export function MemberForm({ trainers, members = [], onCreated }: Props) {
  const [name, setName] = useState('')
  const [phoneBody, setPhoneBody] = useState('')
  const [totalSessions, setTotalSessions] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [registeredAt, setRegisteredAt] = useState(todayDateString())
  const [trainerId, setTrainerId] = useState('')
  const [referrerId, setReferrerId] = useState('')
  const [status, setStatus] = useState<MemberStatus>('active')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sessions = Number(totalSessions)
  const previewExpiry = useMemo(() => {
    if (!registeredAt || !Number.isInteger(sessions) || sessions < 1) return null
    return calcSessionExpiry(registeredAt, sessions)
  }, [registeredAt, sessions])

  const selectedTrainer = trainers.find((t) => t.id === trainerId)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)

    const amount = Number(paymentAmount.replace(/,/g, ''))
    const phoneError = validatePhoneBody(phoneBody)

    if (!name.trim()) {
      setError('이름을 입력해 주세요.')
      return
    }
    if (phoneError) {
      setError(phoneError)
      return
    }
    if (!registeredAt) {
      setError('등록일을 입력해 주세요.')
      return
    }
    if (!Number.isInteger(sessions) || sessions < 1) {
      setError('등록 횟수는 1 이상의 숫자여야 합니다.')
      return
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError('결제 금액을 올바르게 입력해 주세요.')
      return
    }

    setLoading(true)
    try {
      await createMember({
        name,
        phone: phoneBodyToFull(phoneBody),
        total_sessions: sessions,
        payment_amount: amount,
        registered_at: registeredAt,
        trainer_id: trainerId || null,
        trainer_name: selectedTrainer?.name ?? null,
        referred_by_member_id: referrerId || null,
        status,
      })
      setName('')
      setPhoneBody('')
      setTotalSessions('')
      setPaymentAmount('')
      setRegisteredAt(todayDateString())
      setTrainerId('')
      setReferrerId('')
      setStatus('active')
      setMessage('회원이 등록되었습니다.')
      onCreated()
    } catch (err) {
      const msg = getErrorMessage(err)
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : ''
      if (
        code === '23505' ||
        msg.includes('duplicate') ||
        msg.includes('unique')
      ) {
        setError('이미 등록된 전화번호입니다.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={`${cardClass} p-6`}>
      <h2 className="text-lg font-semibold text-charcoal">회원 등록</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        1세션 = {SESSION_DAYS_PER_SESSION}일 · 만료일 자동 계산 · 기간 연장은 회원
        상세에서
      </p>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            이름
          </span>
          <input
            type="text"
            lang="ko"
            inputMode="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            전화번호
          </span>
          <PhoneInput
            value={phoneBody}
            onChange={setPhoneBody}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-charcoal/40">
            010- 은 자동 입력 · 뒤 8자리만 입력
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            담당 트레이너
          </span>
          <select
            value={trainerId}
            onChange={(e) => setTrainerId(e.target.value)}
            className={inputClass}
          >
            <option value="">선택 안 함</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {trainers.length === 0 && (
            <span className="mt-1 block text-xs text-charcoal/40">
              아래 트레이너 관리에서 먼저 등록해 주세요.
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            소개 회원 (선택)
          </span>
          <select
            value={referrerId}
            onChange={(e) => setReferrerId(e.target.value)}
            className={inputClass}
          >
            <option value="">없음</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-charcoal/40">
            지인 소개 시 결제금액 10% MILE이 양쪽에 지급됩니다.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            등록일
          </span>
          <input
            type="date"
            value={registeredAt}
            onChange={(e) => setRegisteredAt(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            예상 만료일
          </span>
          <div className="input-field flex items-center bg-cream/50 text-charcoal/80">
            {previewExpiry ? formatDate(previewExpiry) : '-'}
          </div>
          {Number.isInteger(sessions) && sessions >= 1 && (
            <span className="mt-1 block text-xs text-charcoal/40">
              {formatSessionPeriodHint(sessions)}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            회원 상태
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MemberStatus)}
            className={inputClass}
          >
            {(Object.keys(MEMBER_STATUS_LABELS) as MemberStatus[]).map(
              (key) => (
                <option key={key} value={key}>
                  {MEMBER_STATUS_LABELS[key]}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            등록 횟수 (PT)
          </span>
          <input
            type="number"
            min={1}
            value={totalSessions}
            onChange={(e) => setTotalSessions(e.target.value)}
            placeholder="10"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            결제 금액 (원)
          </span>
          <input
            type="number"
            min={0}
            step={1000}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="500000"
            className={inputClass}
          />
        </label>

        <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? '등록 중…' : '회원 등록'}
          </button>
          {message && (
            <p className="text-sm font-medium text-gold-dark">{message}</p>
          )}
          {error && (
            <p className="text-sm font-medium text-red-700">{error}</p>
          )}
        </div>
      </form>
    </section>
  )
}
