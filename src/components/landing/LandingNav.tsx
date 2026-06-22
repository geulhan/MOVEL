import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../brand/MotionHubLogo'
import { MOTIONHUB_CENTER_GUIDE_PATH } from '../../constants/motionhubGuide'

type LandingNavProps = {
  activePage?: 'landing' | 'guide'
}

export function LandingNav({ activePage = 'landing' }: LandingNavProps) {
  const guideClass =
    activePage === 'guide'
      ? 'rounded-lg bg-motionhub/15 px-3.5 py-2 text-sm font-semibold text-motionhub'
      : 'rounded-lg px-3.5 py-2 text-sm font-medium text-cream/70 transition hover:bg-white/5 hover:text-cream'

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-motionhub-deep/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0">
          <MotionHubLogo tone="light" variant="vertical" size="nav" />
        </Link>

        <nav className="flex items-center">
          <Link to={MOTIONHUB_CENTER_GUIDE_PATH} className={guideClass}>
            이용가이드
          </Link>
        </nav>
      </div>
    </header>
  )
}
