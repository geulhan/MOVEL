import { Link } from 'react-router-dom'
import { getAdminSession } from '../../lib/adminSession'
import { markMemberPortalShared } from '../../lib/centerOnboardingStorage'
import { getMemberPortalUrl } from '../../constants/motionhubGuide'
import { copyText } from '../../lib/siteUrl'
import { btnGold, btnOutline, cardClass } from '../../styles/theme'
import type { Member } from '../../types/database'

type Props = {
  member: Member
  centerSlug: string
  centerName: string
  onContinue?: () => void
}

export function MemberRegistrationSuccessPanel({
  member,
  centerSlug,
  centerName,
  onContinue,
}: Props) {
  const memberWelcomeUrl = getMemberPortalUrl(centerSlug)
  const phoneTail = member.phone.replace(/\D/g, '').slice(-4)

  async function handleCopyLink() {
    const session = getAdminSession()
    if (session?.centerId) markMemberPortalShared(session.centerId)
    await copyText(memberWelcomeUrl)
  }

  return (
    <section className={`${cardClass} space-y-4 border-emerald-200 bg-emerald-50/50 p-5`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          다음 단계
        </p>
        <h3 className="mt-1 text-lg font-bold text-charcoal">
          {member.name} 님 등록 완료 · 알림톡 발송됨
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-charcoal/75">
          회원에게 <strong>카카오 가입 안내</strong>가 자동 발송되었습니다. 회원은 아래
          주소에서 휴대폰 번호와 비밀번호 <strong>뒤 4자리({phoneTail})</strong>로 로그인할
          수 있습니다.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-200/80 bg-white/80 px-4 py-3 text-sm">
        <p className="text-xs font-medium text-muted">회원 앱 주소</p>
        <p className="mt-1 break-all font-mono text-charcoal">{memberWelcomeUrl}</p>
        <p className="mt-2 text-xs text-muted">
          {centerName} · 로그인 비밀번호: 휴대폰 뒤 4자리
        </p>
      </div>

      <ol className="space-y-2 text-sm text-charcoal/80">
        <li className="flex gap-2">
          <span className="font-bold text-emerald-700">1.</span>
          회원이 링크 접속 → 로그인 (또는 회원가입)
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-emerald-700">2.</span>
          다음 예약 · 운동일지 · 잔여횟수 확인
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-emerald-700">3.</span>
          센터에서 PT 예약 등록 → 회원 앱에 바로 표시
        </li>
      </ol>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void handleCopyLink()} className={btnGold}>
          회원 앱 링크 복사
        </button>
        <Link to="/admin/schedule" className={btnOutline}>
          PT 예약 등록하기
        </Link>
        <Link to={`/admin/member/${member.id}`} className={btnOutline}>
          회원 상세 보기
        </Link>
        {onContinue && (
          <button type="button" onClick={onContinue} className={btnOutline}>
            닫기
          </button>
        )}
      </div>
    </section>
  )
}
