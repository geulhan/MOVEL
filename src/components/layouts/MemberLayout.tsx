import { Link } from 'react-router-dom'

type Props = {
  children: React.ReactNode
  memberName?: string
  onLogout?: () => void
}

export function MemberLayout({ children, memberName, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-gold/30 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark">
              Member
            </p>
            <h1 className="text-lg font-bold text-charcoal">
              모벨 퍼포먼스
            </h1>
            {memberName && (
              <p className="text-sm text-muted">{memberName} 님</p>
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
