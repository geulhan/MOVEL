import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../brand/MotionHubLogo'
import { useApplyMemberTheme, useMemberThemeVars } from '../../hooks/useMemberTheme'
import { isPlatformLandingHost } from '../../pages/RootPage'
import { DEFAULT_CENTER_THEME, type CenterTheme } from '../../types/centerBranding'

type Props = {
  children: React.ReactNode
  memberName?: string
  memberTheme?: CenterTheme
  onLogout?: () => void
  onDashboard?: () => void
}

export function MemberLayout({
  children,
  memberName,
  memberTheme,
  onLogout,
  onDashboard,
}: Props) {
  const homeTo = isPlatformLandingHost() ? '/' : '/motionhub'
  const activeTheme = memberTheme ?? DEFAULT_CENTER_THEME
  const themeVars = useMemberThemeVars(activeTheme)
  const themed = Boolean(memberTheme)
  useApplyMemberTheme(activeTheme, { enabled: themed, memberName })
  const isLoggedIn = Boolean(memberName)

  const logo = (
    <MotionHubLogo tone="light" variant="vertical" className="mx-auto items-center" />
  )

  const logoWrapper = onDashboard ? (
    <button
      type="button"
      onClick={onDashboard}
      className="transition hover:opacity-90"
      aria-label="대시보드 (내 정보)"
    >
      {logo}
    </button>
  ) : (
    <Link to="/member" className="transition hover:opacity-90" aria-label="회원 홈">
      {logo}
    </Link>
  )

  return (
    <div
      className="min-h-screen bg-surface"
      style={
        themed
          ? {
              ...themeVars,
              background: 'var(--center-main-bg)',
              color: 'var(--center-main-text)',
            }
          : undefined
      }
    >
      <header className="relative overflow-hidden border-b border-white/10 bg-motionhub-deep">
        <div className="motionhub-glow pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div
          className={`relative mx-auto max-w-lg px-4 ${
            isLoggedIn ? 'pt-4 pb-4' : 'pt-5 pb-6'
          }`}
        >
          <div className="absolute top-4 right-4">
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-white/70 transition hover:text-white"
              >
                로그아웃
              </button>
            ) : (
              <Link
                to="/login"
                className="text-xs font-medium text-motionhub transition hover:underline"
              >
                관리자 →
              </Link>
            )}
          </div>

          <div className="flex flex-col items-center text-center">
            {logoWrapper}
            {isLoggedIn && (
              <p className="mt-3 text-base font-bold text-white">{memberName} 님</p>
            )}
          </div>
        </div>
      </header>

      <main
        className={`mx-auto max-w-lg space-y-4 px-4 ${
          isLoggedIn ? 'py-6' : '-mt-3 pb-8 pt-0'
        }`}
      >
        {children}
      </main>

      <footer className="mx-auto max-w-lg px-4 pb-8 text-center text-[10px] text-muted">
        <Link to={homeTo} className="hover:text-charcoal">
          모션허브 홈
        </Link>
      </footer>
    </div>
  )
}
