import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../components/brand/MotionHubLogo'
import { SiteUrlCopy } from '../components/SiteUrlCopy'
import {
  getAdminLoginUrl,
  getMemberPortalUrl,
  getShareableSiteOrigin,
} from '../lib/siteUrl'
import { btnGold, btnPrimary, cardClass } from '../styles/theme'

export default function HomePage() {
  const memberUrl = getMemberPortalUrl()
  const adminUrl = getAdminLoginUrl()

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-white/10 bg-motionhub-deep px-4 py-5">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <MotionHubLogo tone="light" variant="vertical" />
          <p className="text-center text-xs text-white/60">
            MotionHub · 운동센터 운영 플랫폼
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-md space-y-5 px-4 py-8">
        <p className="text-center text-sm leading-relaxed text-muted">
          센터 등록 후 관리자·회원 페이지를 이용하세요.
        </p>

        <section className={`${cardClass} space-y-4 p-6`}>
          <div>
            <h2 className="text-lg font-bold text-charcoal">센터 시작하기</h2>
            <p className="mt-1 text-sm text-muted">MotionHub에 센터를 등록합니다.</p>
          </div>
          <Link to="/signup" className={`block w-full text-center ${btnPrimary}`}>
            센터 등록
          </Link>
          <Link to="/login" className={`block w-full text-center ${btnGold}`}>
            관리자 로그인
          </Link>
        </section>

        <section className={`${cardClass} space-y-4 p-6`}>
          <div>
            <h2 className="text-lg font-bold text-charcoal">회원 페이지</h2>
            <p className="mt-1 text-sm text-muted">출석, PT 일정, 마일리지</p>
          </div>
          <SiteUrlCopy url={memberUrl} label="회원 페이지 주소" />
          <Link to="/member" className={`block w-full text-center ${btnGold}`}>
            회원 페이지 열기
          </Link>
        </section>

        <section className={`${cardClass} space-y-4 p-6`}>
          <SiteUrlCopy url={adminUrl} label="관리자 로그인 주소" />
        </section>

        <p className="text-center text-xs text-muted">
          공식 사이트: <strong className="text-charcoal">{getShareableSiteOrigin()}</strong>
        </p>
      </div>
    </div>
  )
}
