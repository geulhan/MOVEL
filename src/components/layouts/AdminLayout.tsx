import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { navItemsForSession } from '../../lib/adminPermissions'
import { clearAdminAuth, getAdminSession } from '../../lib/adminSession'
import { MovelBrandSubtitle, MovelLogo } from '../brand/MovelLogo'
import { SetupBanner } from '../SetupBanner'

function MemberPortalLink({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/member"
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-gold/60 bg-gold/15 px-4 py-2 text-sm font-semibold whitespace-nowrap text-gold transition hover:bg-gold/25 ${className}`}
    >
      회원 페이지 →
    </Link>
  )
}

export function AdminLayout() {
  const navigate = useNavigate()
  const session = getAdminSession()
  const navItems = navItemsForSession(session)
  const roleLabel = session?.role === 'trainer' ? '트레이너' : '관리자'

  function handleLogout() {
    clearAdminAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-gold/30 bg-charcoal lg:flex">
        <div className="border-b border-gold/20 px-4 py-5">
          <MovelLogo
            variant="stacked"
            theme="light"
            className="h-[4.5rem] w-auto"
            linkTo="/admin"
          />
          <MovelBrandSubtitle tone="gold" className="mt-2 px-1" />
          <p className="mt-1 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/40">
            Admin
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-gold/20 text-gold'
                    : 'text-cream/70 hover:bg-charcoal-light hover:text-cream'
                }`
              }
            >
              <span className="w-4 shrink-0 text-center text-sm opacity-80">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-gold/20 p-3">
          {session && (
            <p className="truncate px-1 text-xs text-cream/60">
              {session.username}
              <span className="ml-1 text-cream/40">({roleLabel})</span>
            </p>
          )}
          <MemberPortalLink className="w-full !border-gold/40 !bg-gold/10 !text-gold hover:!bg-gold/20" />
          {session?.role === 'admin' && (
            <Link
              to="/trainer"
              className="block w-full truncate rounded-lg border border-cream/15 px-3 py-2 text-center text-xs whitespace-nowrap text-cream/80 transition hover:bg-charcoal-light"
            >
              트레이너 출석부 →
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full rounded-lg border border-red-400/60 bg-white px-3 py-2.5 text-center text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            로그아웃
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 모바일 헤더 */}
        <header className="border-b border-gold/30 bg-charcoal lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <MovelLogo
              variant="horizontal"
              theme="light"
              className="h-8 w-auto max-w-[9.5rem]"
              linkTo="/admin"
            />
            <div className="flex min-w-0 shrink items-center gap-1.5">
              <MemberPortalLink className="!px-2.5 !py-1.5 !text-[11px]" />
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 rounded-lg border border-red-400/60 bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-50"
              >
                로그아웃
              </button>
            </div>
          </div>
          <nav className="chip-scroll px-3 pb-2.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `chip ${isActive ? 'chip-active' : 'chip-inactive !border-charcoal/20 !bg-charcoal-light !text-cream/90'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        {/* 데스크톱 상단 바 — 회원 페이지 전환 버튼 항상 표시 */}
        <div className="sticky top-0 z-20 hidden items-center justify-end gap-2 border-b border-gold/25 bg-white/95 px-6 py-3 backdrop-blur-sm lg:flex">
          {session && (
            <span className="mr-auto text-sm font-medium text-muted">
              {session.username} 님
              <span className="ml-1 text-xs text-muted">({roleLabel})</span>
            </span>
          )}
          {session?.role === 'admin' && (
            <Link
              to="/trainer"
              className="inline-flex shrink-0 items-center rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium whitespace-nowrap text-charcoal transition hover:bg-cream"
            >
              트레이너 출석부
            </Link>
          )}
          <MemberPortalLink className="!border-gold !bg-cream !text-charcoal hover:!bg-gold/20" />
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 rounded-lg border border-red-400 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            로그아웃
          </button>
        </div>

        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <SetupBanner />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
