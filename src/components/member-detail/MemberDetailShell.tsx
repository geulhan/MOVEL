import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { formatPhone } from '../../api/members'
import { btnLinkSm, btnNavBack } from '../../styles/theme'
import { PtAlertBadge } from '../PtAlertBadge'
import { StatusBadge } from '../StatusBadge'
import { MemberDetailProvider, useMemberDetail } from './MemberDetailContext'

const MAIN_TABS = [
  { to: '', end: true, label: '개요' },
  { to: 'pt', end: false, label: 'PT·결제' },
  { to: 'attendance', end: false, label: '출석' },
  { to: 'records', end: false, label: '메모·상담' },
] as const

function MemberDetailShellInner() {
  const navigate = useNavigate()
  const location = useLocation()
  const { member, loading, error } = useMemberDetail()
  const isJournalPage = location.pathname.endsWith('/journal')

  if (loading && !member) {
    return <p className="py-16 text-center text-sm text-muted">불러오는 중…</p>
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          {error ?? '회원을 찾을 수 없습니다.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/admin/members')}
          className={btnLinkSm}
        >
          ← 목록으로
        </button>
      </div>
    )
  }

  const basePath = `/admin/member/${member.id}`

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() =>
          navigate(isJournalPage ? basePath : '/admin/members')
        }
        className={btnNavBack}
      >
        {isJournalPage ? '← 회원 상세' : '← 회원 목록'}
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-2xl font-bold text-charcoal">
              {member.name}
            </h2>
            <PtAlertBadge member={member} />
          </div>
          <p className="mt-1 text-sm text-muted">{formatPhone(member.phone)}</p>
          {isJournalPage && (
            <p className="mt-0.5 text-xs font-medium text-gold">운동일지</p>
          )}
        </div>
        <StatusBadge status={member.status} />
      </header>

      {!isJournalPage && (
        <nav className="chip-scroll -mx-1 px-1">
          {MAIN_TABS.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to ? `${basePath}/${tab.to}` : basePath}
              end={tab.end}
              className={({ isActive }) =>
                `chip whitespace-nowrap ${isActive ? 'chip-active' : 'chip-inactive'}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
          <NavLink
            to={`${basePath}/journal`}
            className={({ isActive }) =>
              `chip whitespace-nowrap ${isActive ? 'chip-active' : 'chip-inactive'}`
            }
          >
            운동일지
          </NavLink>
        </nav>
      )}

      <Outlet />
    </div>
  )
}

export function MemberDetailShell() {
  const { memberId } = useParams<{ memberId: string }>()

  if (!memberId) {
    return (
      <p className="text-sm text-charcoal/60">회원을 찾을 수 없습니다.</p>
    )
  }

  return (
    <MemberDetailProvider memberId={memberId}>
      <MemberDetailShellInner />
    </MemberDetailProvider>
  )
}
