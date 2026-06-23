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
      className="flex shrink-0 items-center transition hover:opacity-90"
      aria-label="대시보드 (내 정보)"
    >
      {logo}
    </button>
  ) : (
    <Link
      to="/member"
      className="flex shrink-0 items-center transition hover:opacity-90"
      aria-label="회원 홈"
    >
      {logo}
    </Link>
  )

  return (
    <div
      className={`min-h-screen ${isLoggedIn ? 'bg-[#f4f6f8]' : 'bg-[#f3f5f7]'}`}
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
      {isLoggedIn ? (
        <header className="sticky top-0 z-20 border-b border-charcoal/10 bg-white/95 shadow-sm shadow-charcoal/5 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {logoWrapper}
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-bold text-charcoal">
                  {memberName} 님
                </p>
                <p className="text-[11px] font-medium text-charcoal/50">
                  모션허브 회원
                </p>
              </div>
            </div>
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="shrink-0 rounded-lg border border-charcoal/15 bg-white px-3 py-1.5 text-xs font-bold text-charcoal transition hover:border-motionhub/40 hover:bg-motionhub-light/50"
              >
                로그아웃
              </button>
            ) : null}
          </div>
        </header>
      ) : (
        <header
          className="relative border-b border-charcoal/6 bg-white"
          style={{ backgroundColor: MOTIONHUB_BRAND.surface }}
        >
          <div className="relative mx-auto max-w-lg px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
            <div className="absolute top-4 right-4 z-10 sm:top-5 sm:right-5">
              <Link
                to="/login"
                className="rounded-lg border border-charcoal/12 bg-white px-3 py-1.5 text-xs font-bold text-charcoal transition hover:border-motionhub/35 hover:bg-motionhub-light/40"
              >
                관리자 로그인
              </Link>
            </div>
            <div className="flex flex-col items-center text-center">{logoWrapper}</div>
          </div>
        </header>
      )}

      <main
        className={`mx-auto max-w-lg ${
          isLoggedIn ? 'space-y-4 px-4 py-5' : 'relative z-10 -mt-5 px-4 pb-8 sm:-mt-6'
        }`}
      >
        {children}
      </main>

      <footer className="mx-auto max-w-lg px-4 pb-8 pt-2 text-center text-xs text-charcoal/45">
        <Link to={homeTo} className="font-medium hover:text-charcoal">
          모션허브 홈
        </Link>
      </footer>
    </div>
  )
}
