import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../brand/MotionHubLogo'
import { MOTIONHUB_BRAND } from '../../constants/motionhubBrand'
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
    <MotionHubLogo
      tone="light"
      variant="vertical"
      size={isLoggedIn ? 'nav' : 'header'}
      className="items-center"
    />
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
      className={`min-h-screen ${isLoggedIn ? 'bg-surface' : 'bg-[#f3f5f7]'}`}
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
      <header
        className="relative"
        style={{ backgroundColor: MOTIONHUB_BRAND.logoHeaderBg }}
      >
        <div
          className={`relative mx-auto max-w-lg px-4 ${
            isLoggedIn ? 'py-4' : 'pb-10 pt-5 sm:pb-12 sm:pt-6'
          }`}
        >
          <div className="absolute top-4 right-4 z-10 sm:top-5 sm:right-5">
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
                className="text-xs font-semibold text-motionhub transition hover:text-motionhub-dark"
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
        className={`mx-auto max-w-lg ${
          isLoggedIn ? 'space-y-4 px-4 py-6' : 'relative z-10 -mt-5 px-4 pb-8 sm:-mt-6'
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
