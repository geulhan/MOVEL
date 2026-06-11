import { Link } from 'react-router-dom'
import { SiteUrlCopy } from '../components/SiteUrlCopy'
import {
  getAdminLoginUrl,
  getMemberPortalUrl,
  getSiteOrigin,
} from '../lib/siteUrl'
import { btnGold, btnPrimary, cardClass } from '../styles/theme'

export default function HomePage() {
  const memberUrl = getMemberPortalUrl()
  const adminUrl = getAdminLoginUrl()

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-md space-y-5">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
            MOVEL
          </p>
          <h1 className="mt-2 text-2xl font-bold text-charcoal">
            모벨 퍼포먼스 트레이닝
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            회원·관리자 페이지로 이동하세요. 주소창에는{' '}
            <strong className="text-charcoal">아래 전체 주소</strong>를
            입력해야 합니다. <code className="text-charcoal">/member</code>만
            입력하면 다른 페이지(광고 등)로 연결될 수 있습니다.
          </p>
        </header>

        <section className={`${cardClass} space-y-4 p-6`}>
          <div>
            <h2 className="text-lg font-bold text-charcoal">회원 페이지</h2>
            <p className="mt-1 text-sm text-muted">
              출석, PT 일정, MY REWARDS 인증
            </p>
          </div>
          <SiteUrlCopy url={memberUrl} label="회원 페이지 주소 (이 주소를 저장하세요)" />
          <Link to="/member" className={`block w-full text-center ${btnGold}`}>
            회원 페이지 열기
          </Link>
        </section>

        <section className={`${cardClass} space-y-4 p-6`}>
          <div>
            <h2 className="text-lg font-bold text-charcoal">관리자 페이지</h2>
            <p className="mt-1 text-sm text-muted">센터 직원·트레이너용</p>
          </div>
          <SiteUrlCopy url={adminUrl} label="관리자 로그인 주소" />
          <Link to="/login" className={`block w-full text-center ${btnPrimary}`}>
            관리자 로그인
          </Link>
        </section>

        <p className="text-center text-xs text-muted">
          공식 사이트: <strong className="text-charcoal">{getSiteOrigin()}</strong>
        </p>
      </div>
    </div>
  )
}
