import { Link } from 'react-router-dom'
import { MotionHubLogo } from '../brand/MotionHubLogo'
import { isPlatformLandingHost } from '../../pages/RootPage'

type Props = {
  children: React.ReactNode
  memberName?: string
  onLogout?: () => void
  onDashboard?: () => void
}

export function MemberLayout({
  children,
  memberName,
  onLogout,
  onDashboard,
}: Props) {
  const homeTo = isPlatformLandingHost() ? '/' : '/motionhub'

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
    <div className="min-h-screen bg-cream">
      <header className="border-b border-charcoal/10 bg-white">
        <div className="relative mx-auto max-w-lg px-4 pt-4 pb-5">
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-charcoal/50 hover:text-charcoal"
              >
                로그아웃
              </button>
            )}
            <Link to="/login" className="text-xs text-teal-700 hover:underline">
              관리자 →
            </Link>
          </div>

          <div className="flex flex-col items-center text-center">
            {brandWrapper}
            {memberName && (
              <p className="mt-2 text-base font-bold text-charcoal">{memberName} 님</p>
            )}
            {!memberName && (
              <p className="mt-2 text-xs text-muted">모션허브 회원 페이지</p>
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
