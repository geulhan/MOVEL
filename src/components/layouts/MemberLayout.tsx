import { Link } from 'react-router-dom'

type Props = {
  children: React.ReactNode
  memberName?: string
  onLogout?: () => void
  onDashboard?: () => void
}

const logoClassName = 'h-[5.5rem] w-auto invert mix-blend-multiply sm:h-24'

export function MemberLayout({
  children,
  memberName,
  onLogout,
  onDashboard,
}: Props) {
  const logo = (
    <img
      src="/logo/movel-stacked-light.png"
      alt="MOVEL"
      className={logoClassName}
      decoding="async"
    />
  )

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-gold/30 bg-cream">
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
            <Link
              to="/admin"
              className="text-xs text-gold-dark hover:underline"
            >
              관리자 →
            </Link>
          </div>

          <div className="flex flex-col items-center text-center">
            {onDashboard ? (
              <button
                type="button"
                onClick={onDashboard}
                className="transition hover:opacity-90"
                aria-label="대시보드 (내 정보)"
              >
                {logo}
              </button>
            ) : (
              <Link
                to="/member"
                className="transition hover:opacity-90"
                aria-label="MOVEL 홈"
              >
                {logo}
              </Link>
            )}
            {memberName && (
              <p className="mt-2 text-base font-bold text-charcoal">
                {memberName} 님
              </p>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">{children}</main>
    </div>
  )
}
