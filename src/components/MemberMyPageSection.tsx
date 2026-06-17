import { useState, type FormEvent } from 'react'
import { changeMemberPassword } from '../api/memberAuth'
import { formatPhone } from '../api/members'
import { getMemberCenterId } from '../api/memberPortal'
import { PlatformFeedbackModal } from './platform/PlatformFeedbackModal'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../styles/theme'

import type { CenterTheme } from '../types/centerBranding'
import { MemberThemeSettings } from './member/MemberThemeSettings'
import { MemberPaymentHistorySection } from './member/MemberPaymentHistorySection'

type Props = {
  phone: string
  memberId: string
  onThemeChange: (theme: CenterTheme) => void
}

export function MemberMyPageSection({ phone, memberId, onThemeChange }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const centerId = getMemberCenterId()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      await changeMemberPassword(phone, currentPassword, newPassword)
      setSuccess('비밀번호가 변경되었습니다.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <MemberPaymentHistorySection memberId={memberId} />

    <section className={`${cardClass} p-6`}>
      <h3 className="text-lg font-semibold text-charcoal">마이페이지</h3>
      <p className="mt-1 text-sm text-muted">계정 정보 및 비밀번호를 관리합니다.</p>

      <dl className="mt-5 space-y-3 rounded-xl bg-cream/60 p-4 text-sm">
        <div>
          <dt className="text-muted">아이디 (휴대전화)</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatPhone(phone)}</dd>
        </div>
      </dl>

      <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <h4 className="text-sm font-bold text-charcoal">비밀번호 변경</h4>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">현재 비밀번호</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
            disabled={loading}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">새 비밀번호</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
            minLength={4}
            disabled={loading}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">새 비밀번호 확인</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
            minLength={4}
            disabled={loading}
          />
        </label>

        <p className="text-xs text-muted">
          최초 비밀번호는 휴대폰 번호 뒤 4자리입니다. 변경 후에는 새 비밀번호로
          로그인하세요.
        </p>

        <button
          type="submit"
          disabled={
            loading ||
            !currentPassword ||
            !newPassword ||
            !confirmPassword
          }
          className={`w-full ${btnPrimary}`}
        >
          {loading ? '변경 중…' : '비밀번호 변경'}
        </button>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}
      </form>

      <MemberThemeSettings memberId={memberId} onThemeChange={onThemeChange} />

      {centerId && (
        <div className="mt-6 border-t border-gold/20 pt-6">
          <h4 className="text-sm font-bold text-charcoal">MotionHub에 의견 보내기</h4>
          <p className="mt-1 text-xs text-muted">버그·기능 요청·개선 사항을 플랫폼 팀에 전달합니다.</p>
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className={`mt-3 w-full ${btnOutline}`}
          >
            의견 보내기
          </button>
        </div>
      )}
    </section>

    {centerId && (
      <PlatformFeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        centerId={centerId}
        createdBy={memberId}
        createdByType="member"
      />
    )}
    </div>
  )
}
