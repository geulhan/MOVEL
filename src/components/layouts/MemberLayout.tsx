import { Link } from 'react-router-dom'
import { MOTIONHUB_BRAND_ASSETS } from '../../constants/motionhubBrand'
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

function MemberHeaderLogo() {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <img
        src={MOTIONHUB_BRAND_ASSETS.logoMemberHeader}
        alt="모션허브"
        className="mx-auto h-auto w-full max-w-[17.5rem] object-contain"
        decoding="async"
      />
    </div>
  )
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

  const logo = <MemberHeaderLogo />

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
      <header className="border-b border-white/10 bg-motionhub-deep">
        <div className="relative mx-auto max-w-lg px-4 pt-4 pb-5">
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-white/70 transition hover:text-white"
              >
                로그아웃
              </button>
            )}
            <Link
              to="/login"
              className="text-xs font-medium text-motionhub transition hover:underline"
            >
              관리자 →
            </Link>
          </div>

          <div className="flex flex-col items-center text-center">
            {logoWrapper}
            {memberName && (
              <p className="mt-3 text-base font-bold text-white">{memberName} 님</p>
            )}
            {!memberName && (
              <p className="mt-3 text-xs text-white/60">모션허브 회원 페이지</p>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-lg px-4 pb-8 text-center text-[10px] text-muted">
        <Link to={homeTo} className="hover:text-charcoal">
          모션허브 홈
        </Link>
      </footer>
    </div>
  )
}
