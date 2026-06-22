import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../brand/MotionHubLogo'
import { MOTIONHUB_MAIN_MESSAGE } from '../../constants/motionhubSeo'
import { MOTIONHUB_CENTER_GUIDE_PATH } from '../../constants/motionhubGuide'

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-motionhub-deep">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link to="/" className="landing-footer-logo inline-block transition hover:opacity-90">
              <MotionHubLogo tone="light" variant="vertical" size="footer" />
            </Link>
            <p className="landing-footer-tagline mt-4 text-sm leading-relaxed text-cream/50">
              {MOTIONHUB_MAIN_MESSAGE}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold tracking-wide text-cream/40 uppercase">
                서비스
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    to={MOTIONHUB_CENTER_GUIDE_PATH}
                    className="text-cream/70 transition hover:text-motionhub"
                  >
                    이용가이드
                  </Link>
                </li>
                <li>
                  <Link
                    to="/signup"
                    className="text-cream/70 transition hover:text-motionhub"
                  >
                    센터 등록
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-cream/70 transition hover:text-motionhub"
                  >
                    관리자 로그인
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold tracking-wide text-cream/40 uppercase">
                회원
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="/member"
                    className="text-cream/70 transition hover:text-motionhub"
                  >
                    회원 포털
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-8 text-xs text-cream/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} 모션허브. All rights reserved.</p>
          <p>Powered by 모션허브</p>
        </div>
      </div>
    </footer>
  )
}
