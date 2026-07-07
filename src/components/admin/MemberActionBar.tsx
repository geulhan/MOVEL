import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendRenewalMessageForMember } from '../../api/messageCampaigns'
import { isFullAdmin } from '../../lib/adminPermissions'
import { getAdminSession } from '../../lib/adminSession'
import { isRenewalTarget } from '../../utils/renewal'
import { useMemberDetail } from '../member-detail/MemberDetailContext'
import { btnGold, btnOutline, cardClass } from '../../styles/theme'

function resultToastMessage(result: Awaited<ReturnType<typeof sendRenewalMessageForMember>>): string {
  if (result.ok && result.status === 'sent') return '재등록 알림톡을 발송했습니다.'
  if (result.status === 'skipped') return result.skippedReason ?? '이미 발송되었거나 생략되었습니다.'
  return result.error ?? '발송에 실패했습니다.'
}

export function MemberActionBar() {
  const { member, memberId } = useMemberDetail()
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const canManage = isFullAdmin(getAdminSession())

  if (!member) return null

  const base = `/admin/member/${memberId}`
  const showRenewal = canManage && isRenewalTarget(member)

  async function handleRenewalSend() {
    if (!window.confirm(`${member!.name}님에게 재등록 알림톡을 보낼까요?`)) return
    setSending(true)
    setMessage(null)
    try {
      const result = await sendRenewalMessageForMember(memberId)
      setMessage(resultToastMessage(result))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '발송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className={`${cardClass} card-pad space-y-3`}>
      <div>
        <h3 className="text-sm font-semibold text-charcoal">다음 행동</h3>
        <p className="text-xs text-muted">한 번의 클릭으로 이어서 처리하세요.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`/admin/reservations?memberId=${memberId}`} className={btnOutline}>
          예약
        </Link>
        <Link to={`/admin/attendance?memberId=${memberId}`} className={btnOutline}>
          출석
        </Link>
        <Link to={`${base}/journal`} className={btnOutline}>
          운동일지
        </Link>
        {canManage && (
          <Link to={`${base}/pt`} className={btnOutline}>
            결제
          </Link>
        )}
        {showRenewal && (
          <button
            type="button"
            onClick={() => void handleRenewalSend()}
            disabled={sending}
            className={btnGold}
          >
            {sending ? '발송 중…' : '재등록 알림'}
          </button>
        )}
        {canManage && (
          <Link
            to={`/admin/messages?campaign=renewal&memberId=${memberId}`}
            className={btnOutline}
          >
            알림톡
          </Link>
        )}
        <Link
          to={`/admin/motionhub?tab=mileage`}
          className={btnOutline}
        >
          후기·마일리지
        </Link>
      </div>
      {message && (
        <p className="rounded-lg border border-charcoal/10 bg-cream/60 px-3 py-2 text-sm text-charcoal">
          {message}
        </p>
      )}
    </section>
  )
}
