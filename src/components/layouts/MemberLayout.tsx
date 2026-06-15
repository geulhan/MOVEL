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

  const brand = (
    <MotionHubLogo tone="dark" showEnglish={false} className="items-center" />
  )

  const brandWrapper = onDashboard ? (
    <button
      type="button"
      onClick={onDashboard}
      className="transition hover:opacity-90"
      aria-label="대시보드 (내 정보)"
    >
      {brand}
    </button>
  ) : (
    <Link to="/member" className="transition hover:opacity-90" aria-label="회원 홈">
      {brand}
    </Link>
  )

  return (
    <div
      className={themed ? 'min-h-screen' : 'min-h-screen bg-cream'}
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
        className={themed ? 'border-b' : 'border-b border-charcoal/10 bg-white'}
        style={
          themed
            ? {
                background: 'var(--center-sidebar-bg)',
                color: 'var(--center-sidebar-text)',
                borderColor: 'color-mix(in srgb, var(--center-accent) 20%, transparent)',
              }
            : undefined
        }
      >
        <div className="relative mx-auto max-w-lg px-4 pt-4 pb-5">
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className={`text-xs hover:opacity-100 ${themed ? 'opacity-70' : 'text-charcoal/50 hover:text-charcoal'}`}
                style={themed ? { color: 'var(--center-sidebar-text)' } : undefined}
              >
                로그아웃
              </button>
            )}
            <Link
              to="/login"
              className={`text-xs hover:underline ${themed ? '' : 'text-teal-700'}`}
              style={themed ? { color: 'var(--center-accent)' } : undefined}
            >
              관리자 →
            </Link>
          </div>

          <div className="flex flex-col items-center text-center">
            {brandWrapper}
            {memberName && (
              <p
                className={`mt-2 text-base font-bold ${themed ? '' : 'text-charcoal'}`}
                style={themed ? { color: 'var(--center-sidebar-text)' } : undefined}
              >
                {memberName} 님
              </p>
            )}
            {!memberName && (
              <p
                className={`mt-2 text-xs ${themed ? '' : 'text-muted'}`}
                style={themed ? { color: 'var(--center-sidebar-muted)' } : undefined}
              >
                모션허브 회원 페이지
              </p>
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
