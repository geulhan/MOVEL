import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getDefaultMemberPasswordHint,
  resetMemberPasswordToDefault,
} from '../../api/memberAuth'
import {
  deleteMember,
  formatCurrency,
  formatDate,
  formatPhone,
  isExpired,
} from '../../api/members'
import { extendMemberPeriod } from '../../api/period'
import { SESSION_DAYS_PER_SESSION } from '../../constants/session'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import { MEMBER_STATUS_LABELS } from '../../types/database'
import { isUnregisteredMember } from '../../utils/renewal'
import { useMemberDetail } from './MemberDetailContext'
import { formatDateTime, ProfileField } from './ui'

export function MemberOverviewTab() {
  const navigate = useNavigate()
  const {
    member,
    memberId,
    periodExtensions,
    payments,
    attendance,
    reload,
    setError,
  } = useMemberDetail()
  const [showPeriod, setShowPeriod] = useState(false)
  const [extendDays, setExtendDays] = useState('7')
  const [extendNote, setExtendNote] = useState('')
  const [extendSaving, setExtendSaving] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [deletingMember, setDeletingMember] = useState(false)
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(
    null,
  )

  if (!member) return null

  const defaultPasswordHint = getDefaultMemberPasswordHint(member.phone)

  const expired =
    member.expires_at != null && isExpired(member.expires_at)
  const basePath = `/admin/member/${memberId}`

  async function handlePasswordReset() {
    const confirmed = window.confirm(
      `${member!.name}님의 비밀번호를 휴대폰 뒤 4자리(${defaultPasswordHint})로 초기화할까요?\n\n회원에게 새 비밀번호를 안내해 주세요.`,
    )
    if (!confirmed) return

    setResettingPassword(true)
    setPasswordResetMessage(null)
    setError(null)
    try {
      await resetMemberPasswordToDefault(memberId)
      setPasswordResetMessage(
        `비밀번호가 ${defaultPasswordHint}(휴대폰 ${formatPhone(member!.phone)} 뒤 4자리)로 초기화되었습니다.`,
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '비밀번호 초기화에 실패했습니다.',
      )
    } finally {
      setResettingPassword(false)
    }
  }

  async function handleDeleteMember() {
    const confirmed = window.confirm(
      `${member!.name}님을 삭제할까요?\n\n결제·출석·메모·운동일지 등 연관 데이터가 모두 삭제되며 되돌릴 수 없습니다.`,
    )
    if (!confirmed) return

    const typed = window.prompt(
      `삭제를 확인하려면 회원 이름 "${member!.name}"을(를) 그대로 입력하세요.`,
    )
    if (typed?.trim() !== member!.name) {
      if (typed !== null) {
        setError('이름이 일치하지 않아 삭제가 취소되었습니다.')
      }
      return
    }

    setDeletingMember(true)
    setError(null)
    try {
      await deleteMember(memberId)
      navigate('/admin/members', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 삭제에 실패했습니다.')
    } finally {
      setDeletingMember(false)
    }
  }

  async function handleExtendSubmit(e: FormEvent) {
    e.preventDefault()
    const days = Number(extendDays)
    if (!Number.isInteger(days) || days < 1) {
      setError('연장 일수를 올바르게 입력해 주세요.')
      return
    }
    setExtendSaving(true)
    setError(null)
    try {
      await extendMemberPeriod(member!, days, extendNote)
      setExtendNote('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '기간 연장 실패')
    } finally {
      setExtendSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className={`${cardClass} card-pad`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-charcoal">기본 정보</h3>
          <button
            type="button"
            onClick={() => void handlePasswordReset()}
            disabled={resettingPassword}
            className={btnOutline}
          >
            {resettingPassword ? '초기화 중…' : '비밀번호 초기화'}
          </button>
        </div>
        {passwordResetMessage && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {passwordResetMessage}
          </p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ProfileField
            label="담당 트레이너"
            value={member.trainer_name ?? '미지정'}
          />
          <ProfileField
            label="상태"
            value={MEMBER_STATUS_LABELS[member.status]}
          />
          <ProfileField
            label="등록일"
            value={formatDate(member.registered_at)}
          />
          <ProfileField
            label="만료일"
            value={formatDate(member.expires_at)}
            highlight={expired}
          />
          <ProfileField
            label="총 결제"
            value={formatCurrency(Number(member.payment_amount))}
          />
          <ProfileField
            label="잔여 PT"
            value={`${member.remaining_sessions} / ${member.total_sessions}회`}
          />
        </dl>
      </section>

      {isUnregisteredMember(member) && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-semibold">미등록 회원 (자가가입)</p>
          <p className="mt-1">
            PT·결제 탭에서 첫 결제를 등록해 주세요.
          </p>
          <Link
            to={`${basePath}/pt`}
            className="mt-2 inline-block text-sm font-semibold text-sky-700 underline"
          >
            PT·결제로 이동 →
          </Link>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to={`${basePath}/pt`}
          className={`${cardClass} card-pad block transition hover:border-gold/50 ${
            isUnregisteredMember(member) ? 'ring-2 ring-sky-300/60' : ''
          }`}
        >
          <p className="text-sm font-semibold text-charcoal">PT · 결제</p>
          <p className="mt-1 text-xs text-muted">
            {isUnregisteredMember(member)
              ? '첫 결제·PT 횟수 등록 필요'
              : `결제 ${payments.length}건 · 잔여 ${member.remaining_sessions}회`}
          </p>
        </Link>
        <Link
          to={`${basePath}/journal`}
          className={`${cardClass} card-pad block transition hover:border-gold/50`}
        >
          <p className="text-sm font-semibold text-charcoal">운동일지</p>
          <p className="mt-1 text-xs text-muted">회원 운동 기록 확인 · 작성</p>
        </Link>
        <Link
          to={`${basePath}/attendance`}
          className={`${cardClass} card-pad block transition hover:border-gold/50`}
        >
          <p className="text-sm font-semibold text-charcoal">출석 내역</p>
          <p className="mt-1 text-xs text-muted">총 {attendance.length}건</p>
        </Link>
        <Link
          to={`${basePath}/records`}
          className={`${cardClass} card-pad block transition hover:border-gold/50`}
        >
          <p className="text-sm font-semibold text-charcoal">메모 · 상담</p>
          <p className="mt-1 text-xs text-muted">관리자 메모 및 상담 기록</p>
        </Link>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <button
          type="button"
          onClick={() => setShowPeriod((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left sm:px-6"
        >
          <div>
            <h3 className="text-sm font-semibold text-charcoal">기간 연장</h3>
            <p className="mt-0.5 text-xs text-muted">
              1세션 = {SESSION_DAYS_PER_SESSION}일 · 별도 연장
            </p>
          </div>
          <span className="text-charcoal/40">{showPeriod ? '▲' : '▼'}</span>
        </button>
        {showPeriod && (
          <div className="border-t border-gold/15 px-5 py-4 sm:px-6">
            <form
              onSubmit={(e) => void handleExtendSubmit(e)}
              className="grid gap-3 sm:grid-cols-[120px_1fr_auto]"
            >
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-charcoal/70">
                  연장 일수
                </span>
                <input
                  type="number"
                  min={1}
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-charcoal/70">
                  사유
                </span>
                <input
                  type="text"
                  lang="ko"
                  value={extendNote}
                  onChange={(e) => setExtendNote(e.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={extendSaving}
                  className={btnPrimary}
                >
                  {extendSaving ? '처리 중…' : '연장'}
                </button>
              </div>
            </form>
            {periodExtensions.length > 0 && (
              <ul className="mt-4 divide-y divide-gold/15 border-t border-gold/15 pt-2 text-sm">
                {periodExtensions.map((ext) => (
                  <li
                    key={ext.id}
                    className="flex justify-between gap-2 py-2"
                  >
                    <span className="font-medium">+{ext.days_added}일</span>
                    <span className="text-xs text-charcoal/40 tabular-nums">
                      {formatDateTime(ext.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50/40 p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-red-800">위험 구역</h3>
        <p className="mt-1 text-sm text-red-700/90">
          회원을 삭제하면 결제·출석·메모·운동일지·로그인 정보가 함께
          삭제됩니다. 알림 발송 이력은 회원 연결만 해제됩니다.
        </p>
        <button
          type="button"
          onClick={() => void handleDeleteMember()}
          disabled={deletingMember}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
        >
          {deletingMember ? '삭제 중…' : '회원 삭제'}
        </button>
      </section>
    </div>
  )
}
