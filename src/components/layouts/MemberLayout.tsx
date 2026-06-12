import { Link } from 'react-router-dom'
import { MovelBrandSubtitle, MovelLogo } from '../brand/MovelLogo'

type Props = {
  children: React.ReactNode
  memberName?: string
  onLogout?: () => void
}

export function MemberLayout({ children, memberName, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-gold/30 bg-cream">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <MovelLogo
              variant="stacked"
              tone="charcoal"
              className="h-14 w-auto"
              linkTo="/member"
            />
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
