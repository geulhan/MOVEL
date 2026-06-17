import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearPlatformAuth, getPlatformSession } from '../../lib/platformSession'

const NAV_ITEMS = [
  { to: '/platform', end: true, label: '대시보드' },
  { to: '/platform/centers', end: false, label: '센터' },
  { to: '/platform/analytics', end: false, label: '분석' },
  { to: '/platform/feedback', end: false, label: '피드백' },
  { to: '/platform/beta', end: false, label: '베타' },
  { to: '/platform/beta-applications', end: false, label: '베타 신청' },
  { to: '/platform/consents', end: false, label: '가입·동의' },
  { to: '/platform/centers/new', end: false, label: '센터 생성' },
]

export function PlatformLayout() {
  const navigate = useNavigate()
  const session = getPlatformSession()

  function handleLogout() {
    clearPlatformAuth()
    navigate('/platform/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-cream">
      <header className="border-b border-white/10 bg-[#121820]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <Link to="/platform" className="text-lg font-bold tracking-tight text-white">
              MotionHub Platform
            </Link>
            <p className="text-xs text-cream/50">Super Admin Console</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {session && (
              <span className="hidden max-w-[120px] truncate text-sm text-cream/70 sm:inline md:max-w-none">
                {session.displayName ?? session.username}
              </span>
            )}
            <Link
              to="/motionhub"
              className="rounded-lg border border-white/15 px-2.5 py-2 text-xs text-cream/80 hover:bg-white/5 sm:px-3"
            >
              랜딩
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-red-400/40 px-2.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 sm:px-3"
            >
              로그아웃
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:gap-2 sm:px-6">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-2.5 py-2 text-xs sm:px-3 sm:text-sm ${
                  isActive ? 'bg-white/10 text-white' : 'text-cream/60 hover:text-cream'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
