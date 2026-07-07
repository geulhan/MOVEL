import { useMemo, useState } from 'react'
import { BetaStartProvider, useBetaStart } from '../../contexts/BetaStartContext'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { navItemsForSession } from '../../lib/adminPermissions'
import { clearAdminAuth, getAdminSession } from '../../lib/adminSession'
import { resetCenterIdCache } from '../../lib/center'
import { buildAdminLoginPath } from '../../lib/centerSlug'
import { getMemberPortalUrl } from '../../lib/siteUrl'
import { useCenterFeatures } from '../../hooks/useCenterFeatures'
import { CenterBrandMark } from '../brand/CenterBrandMark'
import { ErrorBoundary } from '../ErrorBoundary'
import { SetupBanner } from '../SetupBanner'
import { MotionHubSupportLink } from '../admin/MotionHubSupportLink'
import { PlatformFeedbackModal } from '../platform/PlatformFeedbackModal'
import {
  CenterBrandingProvider,
  useCenterBranding,
  useCenterThemeVars,
  useApplyCenterTheme,
} from '../../hooks/useCenterBranding'

function MemberPortalLink({
  className = '',
  centerSlug,
}: {
  className?: string
  centerSlug?: string
}) {
  const href = getMemberPortalUrl(centerSlug)

  return (
    <a
      href={href}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${className}`}
      style={{
        borderColor: 'color-mix(in srgb, var(--center-accent) 60%, transparent)',
        background: 'color-mix(in srgb, var(--center-accent) 15%, transparent)',
        color: 'var(--center-accent)',
      }}
    >
      회원 페이지 →
    </a>
  )
}

function AdminLayoutInner() {
  const navigate = useNavigate()
  const session = getAdminSession()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const { branding } = useCenterBranding()
  const themeVars = useCenterThemeVars(branding.theme)
  useApplyCenterTheme(branding.theme, branding.centerName)
  const { features } = useCenterFeatures()
  const { complete: betaStartComplete, loading: betaStartLoading } = useBetaStart()
  const navItems = useMemo(() => {
    const items = navItemsForSession(session, features)
    if (
      session?.role === 'admin' &&
      !betaStartLoading &&
      !betaStartComplete
    ) {
      return [
        {
          to: '/admin/beta-start',
          end: false,
          label: '베타 시작하기',
          icon: '✦',
          roles: ['admin'] as const,
        },
        ...items,
      ]
    }
    return items
  }, [session, features, betaStartLoading, betaStartComplete])
  const roleLabel = session?.role === 'trainer' ? '트레이너' : '관리자'

  function handleLogout() {
    const centerSlug = session?.centerSlug
    clearAdminAuth()
    resetCenterIdCache()
    navigate(buildAdminLoginPath(centerSlug), { replace: true })
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ ...themeVars, background: 'var(--center-main-bg)', color: 'var(--center-main-text)' }}
    >
      <aside
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r lg:flex"
        style={{
          background: 'var(--center-sidebar-bg)',
          borderColor: 'color-mix(in srgb, var(--center-accent) 30%, transparent)',
        }}
      >
        <div
          className="border-b px-4 py-5"
          style={{ borderColor: 'color-mix(in srgb, var(--center-accent) 20%, transparent)' }}
        >
          <CenterBrandMark branding={branding} linkTo="/admin" />
          <p
            className="mt-2 px-1 text-[10px] font-medium leading-relaxed"
            style={{ color: 'var(--center-sidebar-muted)' }}
          >
            모션허브 센터 관리
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition"
              style={({ isActive }) =>
                isActive
                  ? {
                      background: 'var(--center-tab-active-bg)',
                      color: 'var(--center-tab-active-text)',
                    }
                  : {
                      color: 'var(--center-sidebar-muted)',
                    }
              }
            >
              <span className="w-4 shrink-0 text-center text-sm opacity-80">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div
          className="space-y-2 border-t p-3"
          style={{ borderColor: 'color-mix(in srgb, var(--center-accent) 20%, transparent)' }}
        >
          {session && (
            <p className="truncate px-1 text-xs" style={{ color: 'var(--center-sidebar-muted)' }}>
              {session.username}
              <span className="ml-1 opacity-70">({roleLabel})</span>
            </p>
          )}
          <MemberPortalLink
            centerSlug={session?.centerSlug}
            className="w-full !px-3 !py-2 !text-xs"
          />
          <p className="px-1 text-[11px] leading-relaxed" style={{ color: 'var(--center-sidebar-muted)' }}>
            플랫폼 문의{' '}
            <MotionHubSupportLink compact className="!text-[11px] !font-medium" />
          </p>
          {session && (
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="block w-full rounded-lg border px-3 py-2 text-center text-xs font-semibold transition hover:bg-white/5"
              style={{
                borderColor: 'color-mix(in srgb, var(--center-accent) 40%, transparent)',
                color: 'var(--center-sidebar-text)',
              }}
            >
              의견 보내기
            </button>
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
        <header
          className="border-b lg:hidden"
          style={{
            background: 'var(--center-sidebar-bg)',
            borderColor: 'color-mix(in srgb, var(--center-accent) 30%, transparent)',
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <CenterBrandMark branding={branding} variant="mobile" linkTo="/admin" />
            <div className="flex min-w-0 shrink items-center gap-1.5">
              <MemberPortalLink
                centerSlug={session?.centerSlug}
                className="!px-2.5 !py-1.5 !text-[11px]"
              />
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
                className="chip rounded-full border px-3 py-1.5 text-xs font-medium transition"
                style={({ isActive }) =>
                  isActive
                    ? {
                        background: 'var(--center-tab-active-bg)',
                        color: 'var(--center-tab-active-text)',
                        borderColor: 'color-mix(in srgb, var(--center-accent) 40%, transparent)',
                      }
                    : {
                        background: 'color-mix(in srgb, var(--center-sidebar-text) 8%, transparent)',
                        color: 'var(--center-sidebar-muted)',
                        borderColor: 'color-mix(in srgb, var(--center-sidebar-text) 12%, transparent)',
                      }
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <div
          className="sticky top-0 z-20 hidden items-center justify-end gap-2 border-b px-6 py-3 backdrop-blur-sm lg:flex"
          style={{
            background: 'color-mix(in srgb, var(--center-main-bg) 95%, white)',
            borderColor: 'color-mix(in srgb, var(--center-accent) 25%, transparent)',
          }}
        >
          {session && (
            <span className="mr-auto text-sm font-medium opacity-70">
              {session.username} 님
              <span className="ml-1 text-xs opacity-80">({roleLabel})</span>
            </span>
          )}
          <MemberPortalLink
            centerSlug={session?.centerSlug}
            className="!border-[color-mix(in_srgb,var(--center-accent)_60%,transparent)] !bg-[color-mix(in_srgb,var(--center-accent)_12%,transparent)] !text-[var(--center-main-text)]"
          />
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
          <ErrorBoundary area="admin">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {session && (
        <PlatformFeedbackModal
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          centerId={session.centerId}
          createdBy={session.adminId}
          createdByType={session.role === 'trainer' ? 'trainer' : 'admin'}
        />
      )}
    </div>
  )
}

export function AdminLayout() {
  return (
    <CenterBrandingProvider>
      <BetaStartProvider>
        <AdminLayoutInner />
      </BetaStartProvider>
    </CenterBrandingProvider>
  )
}
