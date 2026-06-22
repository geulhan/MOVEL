import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../brand/MotionHubLogo'
import { MOTIONHUB_CENTER_GUIDE_PATH } from '../../constants/motionhubGuide'

export function LandingFooter() {
  return (
    <footer className="border-t border-charcoal/10 bg-motionhub-deep py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <MotionHubLogo tone="light" variant="vertical" showTagline />
        <p className="mt-4 text-sm text-cream/55">운동센터 운영 플랫폼</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link
            to={MOTIONHUB_CENTER_GUIDE_PATH}
            className="font-medium text-cream/70 transition hover:text-motionhub"
          >
            이용가이드
          </Link>
          <a
            href="/signup"
            className="font-medium text-cream/70 transition hover:text-motionhub"
          >
            센터 등록
          </a>
          <a
            href="/login"
            className="font-medium text-cream/70 transition hover:text-motionhub"
          >
            로그인
          </a>
        </div>
        <p className="mt-2 text-xs font-medium tracking-wide text-cream/40">
          Powered by 모션허브
        </p>
        <p className="mt-8 text-xs text-cream/35">
          © {new Date().getFullYear()} 모션허브. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
