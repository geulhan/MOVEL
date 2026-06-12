import { Link } from 'react-router-dom'
import { MovelBrandSubtitle } from '../brand/MovelLogo'

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
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-gold/30 bg-cream">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            {onDashboard ? (
              <button
                type="button"
                onClick={onDashboard}
                className="inline-block transition hover:opacity-90"
                aria-label="대시보드 (내 정보)"
              >
                <img
                  src="/logo/movel-stacked-light.png"
                  alt="MOVEL"
                  className="h-[4.25rem] w-auto invert mix-blend-multiply"
                  decoding="async"
                />
              </button>
            ) : (
              <Link
                to="/member"
                className="inline-block transition hover:opacity-90"
                aria-label="MOVEL 홈"
              >
                <img
                  src="/logo/movel-stacked-light.png"
                  alt="MOVEL"
                  className="h-[4.25rem] w-auto invert mix-blend-multiply"
                  decoding="async"
                />
              </Link>
            )}
            <MovelBrandSubtitle tone="gold" className="mt-1.5" />
            {memberName && (
              <p className="mt-1 text-sm text-muted">{memberName} 님</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-charcoal/50 hover:text-charcoal"
              >
                로그아웃
              </button>
            )}
            <Link
              to="/admin"
              className="text-xs text-gold-dark hover:underline"
            >
              관리자 →
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">{children}</main>
    </div>
  )
}
