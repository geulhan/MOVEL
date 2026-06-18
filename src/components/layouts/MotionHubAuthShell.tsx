import { Link } from 'react-router-dom'
import { getMotionHubDemoUrl } from '../../constants/motionhub'
import { MOTIONHUB_SUB_MESSAGE_LINES } from '../../constants/motionhubSeo'
import { isPlatformLandingHost } from '../../pages/RootPage'
import { MotionHubLogo } from '../brand/MotionHubLogo'

type Props = {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function MotionHubAuthShell({ children, title, subtitle }: Props) {
  const homeTo = isPlatformLandingHost() ? '/' : '/motionhub'
  const betaTo = isPlatformLandingHost() ? '/#beta' : '/motionhub#beta'
  const demoUrl = getMotionHubDemoUrl()

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-white/10 bg-motionhub-deep">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-4">
          <Link to={homeTo} className="transition hover:opacity-90">
            <MotionHubLogo tone="light" variant="symbol" />
          </Link>
          <div className="flex gap-2 text-xs font-semibold">
            <Link
              to="/signup"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-white/80 hover:bg-white/5"
            >
              센터 등록
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-motionhub px-3 py-1.5 text-charcoal hover:bg-motionhub-dark"
            >
              로그인
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-motionhub-deep px-4 py-8 sm:py-10">
        <div className="motionhub-glow pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-md">
          <MotionHubLogo tone="light" variant="vertical" size="hero" />
          <p className="mt-5 text-sm leading-relaxed text-white/65 sm:text-base">
            {MOTIONHUB_SUB_MESSAGE_LINES.join(' · ')}
            <br />
            하나로 연결하세요.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a
              href={betaTo}
              className="rounded-xl bg-motionhub px-5 py-2.5 text-center text-sm font-bold text-charcoal transition hover:bg-motionhub-dark"
            >
              베타 신청하기
            </a>
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-center text-sm font-bold text-white transition hover:border-white/35 hover:bg-white/10"
            >
              데모 보기
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-md space-y-4 px-4 py-8">
        {(title || subtitle) && (
          <div className="text-center">
            {title && <h1 className="text-xl font-bold text-charcoal">{title}</h1>}
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
