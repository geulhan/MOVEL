import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../brand/MotionHubLogo'
import { MOTIONHUB_CENTER_GUIDE_PATH } from '../../constants/motionhubGuide'

export const LANDING_SECTION_LINKS = [
  { id: 'why', label: '왜 필요한가' },
  { id: 'automation', label: '자동화' },
  { id: 'ai', label: 'AI 비서' },
  { id: 'faq', label: 'FAQ' },
] as const

type LandingNavProps = {
  activePage?: 'landing' | 'guide'
  onScrollTo?: (id: string) => void
}

const navLinkClass =
  'rounded-lg px-3.5 py-2 text-sm font-medium text-cream/70 transition hover:bg-white/5 hover:text-cream'

export function LandingNav({ activePage = 'landing', onScrollTo }: LandingNavProps) {
  const [open, setOpen] = useState(false)

  const scroll = (id: string) => {
    setOpen(false)
    if (onScrollTo) onScrollTo(id)
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  function SectionLink({ id, label }: { id: string; label: string }) {
    if (activePage === 'landing') {
      return (
        <button type="button" onClick={() => scroll(id)} className={navLinkClass}>
          {label}
        </button>
      )
    }

    return (
      <Link to={`/#${id}`} className={navLinkClass} onClick={() => setOpen(false)}>
        {label}
      </Link>
    )
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-motionhub-deep/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="landing-nav-brand shrink-0" onClick={() => setOpen(false)}>
          <MotionHubLogo tone="light" variant="vertical" size="nav" />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {LANDING_SECTION_LINKS.map((item) => (
            <SectionLink key={item.id} id={item.id} label={item.label} />
          ))}
          <Link
            to={MOTIONHUB_CENTER_GUIDE_PATH}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              activePage === 'guide'
                ? 'bg-motionhub/15 font-semibold text-motionhub'
                : 'text-cream/70 hover:bg-white/5 hover:text-cream'
            }`}
          >
            이용가이드
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/login"
            className="rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-cream transition hover:border-white/20 hover:bg-white/5"
          >
            로그인
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-motionhub px-4 py-2 text-sm font-bold text-charcoal transition hover:bg-motionhub-dark"
          >
            무료 세팅 시작하기
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-cream md:hidden"
          aria-label="메뉴"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/8 bg-motionhub-deep/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {LANDING_SECTION_LINKS.map((item) =>
              activePage === 'landing' ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scroll(item.id)}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-cream/85"
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.id}
                  to={`/#${item.id}`}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-cream/85"
                >
                  {item.label}
                </Link>
              ),
            )}
            <Link
              to={MOTIONHUB_CENTER_GUIDE_PATH}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                activePage === 'guide' ? 'text-motionhub' : 'text-cream/85'
              }`}
            >
              이용가이드
            </Link>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-cream/85"
            >
              로그인
            </Link>
            <Link
              to="/signup"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-motionhub px-3 py-2.5 text-center text-sm font-bold text-charcoal"
            >
              무료 세팅 시작하기
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
