import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../brand/MotionHubLogo'
import { isPlatformLandingHost } from '../../pages/RootPage'

type Props = {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function MotionHubAuthShell({ children, title, subtitle }: Props) {
  const homeTo = isPlatformLandingHost() ? '/' : '/motionhub'

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-charcoal/10 bg-charcoal">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-4">
          <Link to={homeTo} className="transition hover:opacity-90">
            <MotionHubLogo tone="light" />
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
