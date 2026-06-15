import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearPlatformAuth, getPlatformSession } from '../../lib/platformSession'

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
          <div className="flex items-center gap-3">
            {session && (
              <span className="hidden text-sm text-cream/70 sm:inline">
                {session.displayName ?? session.username}
              </span>
            )}
            <Link
              to="/motionhub"
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-cream/80 hover:bg-white/5"
            >
              랜딩
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
            >
              로그아웃
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 px-4 pb-3 sm:px-6">
          <NavLink
            to="/platform"
            end
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm ${
                isActive ? 'bg-white/10 text-white' : 'text-cream/60 hover:text-cream'
              }`
            }
          >
            센터 목록
          </NavLink>
          <NavLink
            to="/platform/centers/new"
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm ${
                isActive ? 'bg-white/10 text-white' : 'text-cream/60 hover:text-cream'
              }`
            }
          >
            센터 생성
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
