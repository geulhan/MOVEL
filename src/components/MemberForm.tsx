import { useState, type FormEvent } from 'react'
import {
  createMember,
  DUPLICATE_MEMBER_PHONE_MESSAGE,
  todayDateString,
} from '../api/members'
import { getErrorMessage } from '../lib/errors'
import { btnPrimary, cardClass, inputClass } from '../styles/theme'
import {
  MEMBER_STATUS_LABELS,
  type Member,
  type MemberStatus,
  type Trainer,
} from '../types/database'
import { PaymentRequestModal } from './member-detail/PaymentRequestModal'
import { MemberRegistrationSuccessPanel } from './admin/MemberRegistrationSuccessPanel'
import {
  PhoneInput,
  phoneBodyToFull,
  validatePhoneBody,
} from './PhoneInput'

type Props = {
  trainers: Trainer[]
  members?: Member[]
  onCreated: () => void
  onboardingMode?: boolean
  centerSlug?: string
  centerName?: string
}

export function MemberForm({
  trainers,
  members = [],
  onCreated,
  onboardingMode = false,
  centerSlug = '',
  centerName = '',
}: Props) {
  const [name, setName] = useState('')
  const [phoneBody, setPhoneBody] = useState('')
  const [registeredAt, setRegisteredAt] = useState(todayDateString())
  const [trainerId, setTrainerId] = useState('')
  const [referrerId, setReferrerId] = useState('')
  const [status, setStatus] = useState<MemberStatus>('active')
  const [sendPaymentRequest, setSendPaymentRequest] = useState(!onboardingMode)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [registeredMember, setRegisteredMember] = useState<Member | null>(null)
  const [paymentModalMember, setPaymentModalMember] = useState<{
    id: string
    name: string
  } | null>(null)

  const selectedTrainer = trainers.find((t) => t.id === trainerId)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)

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

    setLoading(true)
    try {
      const member = await createMember({
        name,
        phone: phoneBodyToFull(phoneBody),
        total_sessions: 0,
        payment_amount: 0,
        registered_at: registeredAt,
        trainer_id: trainerId || null,
        trainer_name: selectedTrainer?.name ?? null,
        referred_by_member_id: referrerId || null,
        status,
      })

      setName('')
      setPhoneBody('')
      setRegisteredAt(todayDateString())
      setTrainerId('')
      setReferrerId('')
      setStatus('active')
      onCreated()

      if (sendPaymentRequest && !onboardingMode) {
        setPaymentModalMember({ id: member.id, name: member.name })
      } else if (onboardingMode && centerSlug) {
        setRegisteredMember(member)
      } else {
        setMessage(
          '회원이 등록되었습니다. 가입 안내 알림톡이 발송되었습니다.',
        )
      }
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
        setError(DUPLICATE_MEMBER_PHONE_MESSAGE)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className={`${cardClass} p-6`}>
        <h2 className="text-lg font-semibold text-charcoal">
          {onboardingMode ? '첫 회원 등록' : '회원 등록'}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {onboardingMode ? (
            <>
              <strong className="font-medium text-charcoal">이름·휴대폰만</strong>{' '}
              입력하세요. 등록과 동시에 회원에게 가입 안내 알림톡이 발송됩니다.
            </>
          ) : (
            <>
              연락처·기본 정보만 등록합니다. PT 횟수와 결제 금액은{' '}
              <strong className="font-medium text-charcoal">결제 요청</strong>으로
              보내 계약서·결제를 진행하세요. (등록 시 세션·금액을 넣으면 계약서와
              맞지 않을 수 있습니다.)
            </>
          )}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
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

          {!onboardingMode && (
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
              결제 요청 완료 시 소개 MILE이 지급됩니다.
            </span>
          </label>
          )}

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

          {!onboardingMode && (
          <label className="flex items-start gap-2 sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              checked={sendPaymentRequest}
              onChange={(e) => setSendPaymentRequest(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gold/40"
            />
            <span className="text-sm text-charcoal">
              <span className="font-medium">등록 후 결제 요청 보내기</span>
              <span className="mt-0.5 block text-xs text-muted">
                체크하면 등록 직후 PT·이용권 결제 요청 화면이 열립니다. 계약서가
                자동 발급됩니다.
              </span>
            </span>
          </label>
          )}

          <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading
                ? '등록 중…'
                : onboardingMode
                  ? '등록하고 알림톡 보내기'
                  : '회원 등록'}
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

      {registeredMember && centerSlug && (
        <MemberRegistrationSuccessPanel
          member={registeredMember}
          centerSlug={centerSlug}
          centerName={centerName || centerSlug}
          onContinue={() => setRegisteredMember(null)}
        />
      )}

      {paymentModalMember && (
        <PaymentRequestModal
          memberId={paymentModalMember.id}
          memberName={paymentModalMember.name}
          open
          initialCategory="pt"
          onClose={() => {
            const memberName = paymentModalMember.name
            setPaymentModalMember(null)
            setMessage(
              `${memberName}님이 등록되었습니다. 결제 요청은 회원 상세에서도 보낼 수 있습니다.`,
            )
          }}
          onSuccess={async () => {
            const memberName = paymentModalMember.name
            setPaymentModalMember(null)
            setMessage(`${memberName}님 등록 및 결제 요청을 보냈습니다.`)
            onCreated()
          }}
          onError={(msg) => setError(msg)}
        />
      )}
    </>
  )
}
