import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../components/brand/MotionHubLogo'
import { SiteUrlCopy } from '../components/SiteUrlCopy'
import { getMemberPortalUrl } from '../lib/siteUrl'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-motionhub-deep px-4 text-center">
      <MotionHubLogo tone="light" variant="vertical" size="header" className="mb-8" />
      <p className="text-sm font-medium text-motionhub">404</p>
      <h1 className="mt-2 text-xl font-bold text-cream">페이지를 찾을 수 없습니다</h1>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/"
          className="rounded-lg bg-motionhub px-5 py-2.5 text-sm font-semibold text-charcoal"
        >
          홈으로
        </Link>
        <Link
          to="/guide"
          className="rounded-lg border border-cream/25 px-5 py-2.5 text-sm font-semibold text-cream"
        >
          시작 가이드
        </Link>
        <Link
          to="/login"
          className="rounded-lg border border-cream/25 px-5 py-2.5 text-sm font-semibold text-cream"
        >
          관리자 로그인
        </Link>
      </div>
      <div className="mt-6 w-full max-w-md">
        <SiteUrlCopy url={getMemberPortalUrl()} label="회원 페이지 주소" />
      </div>
    </div>
  )
}
