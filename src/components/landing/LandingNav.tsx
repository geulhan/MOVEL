import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../brand/MotionHubLogo'
import { MOTIONHUB_CENTER_GUIDE_PATH } from '../../constants/motionhubGuide'

type LandingNavProps = {
  activePage?: 'landing' | 'guide'
  onScrollTo?: (id: string) => void
}

export function LandingNav({ activePage = 'landing', onScrollTo }: LandingNavProps) {
  const scroll = (id: string) => {
    if (onScrollTo) onScrollTo(id)
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-motionhub-deep/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="shrink-0">
          <MotionHubLogo tone="light" variant="symbol" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-cream/70 md:flex">
          {activePage === 'landing' ? (
            <>
              <button
                type="button"
                onClick={() => scroll('problems')}
                className="transition hover:text-cream"
              >
                문제
              </button>
              <button
                type="button"
                onClick={() => scroll('features')}
                className="transition hover:text-cream"
              >
                기능
              </button>
              <button
                type="button"
                onClick={() => scroll('case-study')}
                className="transition hover:text-cream"
              >
                사례
              </button>
              <button
                type="button"
                onClick={() => scroll('contact')}
                className="transition hover:text-cream"
              >
                도입 문의
              </button>
            </>
          ) : null}
          <Link
            to={MOTIONHUB_CENTER_GUIDE_PATH}
            className={
              activePage === 'guide'
                ? 'font-semibold text-motionhub'
                : 'transition hover:text-cream'
            }
          >
            이용가이드
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to={MOTIONHUB_CENTER_GUIDE_PATH}
            className="rounded-lg border border-cream/20 px-3 py-2 text-xs font-semibold text-cream/85 hover:bg-white/5 md:hidden"
          >
            가이드
          </Link>
          <a
            href="/signup"
            className="hidden rounded-lg border border-cream/20 px-3 py-2 text-xs font-semibold text-cream/85 hover:bg-white/5 sm:inline-block"
          >
            센터 등록
          </a>
          <a
            href="/login"
            className="rounded-lg border border-cream/20 px-3 py-2 text-xs font-semibold text-cream/85 hover:bg-white/5"
          >
            로그인
          </a>
          {activePage === 'landing' ? (
            <button
              type="button"
              onClick={() => scroll('beta')}
              className="rounded-lg bg-motionhub px-4 py-2 text-sm font-bold text-charcoal transition hover:bg-motionhub-dark"
            >
              베타 신청
            </button>
          ) : (
            <a
              href="/signup"
              className="rounded-lg bg-motionhub px-4 py-2 text-sm font-bold text-charcoal transition hover:bg-motionhub-dark"
            >
              센터 등록
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
