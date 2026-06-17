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
    <div className="min-h-screen bg-cream">
      <header className="border-b border-charcoal/10 bg-charcoal">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-4">
          <Link to={homeTo} className="transition hover:opacity-90">
            <MotionHubLogo tone="light" showEnglish={false} />
          </Link>
          <div className="flex gap-2 text-xs font-semibold">
            <Link
              to="/signup"
              className="rounded-lg border border-cream/20 px-3 py-1.5 text-cream/80 hover:bg-white/5"
            >
              센터 등록
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-teal-500 px-3 py-1.5 text-charcoal hover:bg-teal-400"
            >
              로그인
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-charcoal px-4 py-8 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(45,212,191,0.35), transparent), radial-gradient(ellipse 50% 40% at 100% 50%, rgba(200,184,130,0.12), transparent)',
          }}
        />
        <div className="relative mx-auto max-w-md">
          <MotionHubLogo tone="light" size="hero" showEnglish={false} />
          <p className="mt-4 text-lg font-semibold leading-snug text-cream sm:text-xl">
            회원이 운동을 지속하게 만드는
            <br />
            운동센터 운영 플랫폼
          </p>
          <p className="mt-3 text-sm leading-relaxed text-cream/65 sm:text-base">
            {MOTIONHUB_SUB_MESSAGE_LINES.join(' · ')}
            <br />
            하나로 연결하세요.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a
              href={betaTo}
              className="rounded-xl bg-teal-500 px-5 py-2.5 text-center text-sm font-bold text-charcoal transition hover:bg-teal-400"
            >
              베타 신청하기
            </a>
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-cream/25 bg-cream/5 px-5 py-2.5 text-center text-sm font-bold text-cream transition hover:border-cream/40 hover:bg-cream/10"
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
