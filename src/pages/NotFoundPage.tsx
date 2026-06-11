import { Link } from 'react-router-dom'
import { SiteUrlCopy } from '../components/SiteUrlCopy'
import { getMemberPortalUrl } from '../lib/siteUrl'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
      <p className="text-sm font-medium text-gold-dark">404</p>
      <h1 className="mt-2 text-xl font-bold text-charcoal">페이지를 찾을 수 없습니다</h1>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/admin"
          className="rounded-lg bg-charcoal px-5 py-2.5 text-sm font-semibold text-cream"
        >
          관리자 페이지
        </Link>
        <Link
          to="/member"
          className="rounded-lg border border-gold/50 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal"
        >
          회원 페이지
        </Link>
      </div>
      <div className="mt-6 w-full max-w-md">
        <SiteUrlCopy url={getMemberPortalUrl()} label="회원 페이지 주소" />
      </div>
    </div>
  )
}
