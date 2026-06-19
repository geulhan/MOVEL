import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { formatPhone } from '../../api/members'
import { getMemberDetailTabs } from '../../lib/adminPermissions'
import { getAdminSession } from '../../lib/adminSession'
import { useCenterFeatures } from '../../hooks/useCenterFeatures'
import { btnLinkSm, btnNavBack } from '../../styles/theme'
import { PtAlertBadge } from '../PtAlertBadge'
import { StatusBadge } from '../StatusBadge'
import { MemberDetailProvider, useMemberDetail } from './MemberDetailContext'

function MemberDetailShellInner() {
  const navigate = useNavigate()
  const location = useLocation()
  const { member, loading, error } = useMemberDetail()
  const isSubPage =
    location.pathname.endsWith('/journal') ||
    location.pathname.endsWith('/inbody')
  const subPageLabel = location.pathname.endsWith('/inbody')
    ? '인바디'
    : location.pathname.endsWith('/journal')
      ? '운동일지'
      : null
  const { features } = useCenterFeatures()
  const mainTabs = getMemberDetailTabs(getAdminSession(), features)

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
          navigate(isSubPage ? basePath : '/admin/members')
        }
        className={btnNavBack}
      >
        {isSubPage ? '← 회원 상세' : '← 회원 목록'}
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
          {subPageLabel && (
            <p className="mt-0.5 text-xs font-medium text-gold">{subPageLabel}</p>
          )}
        </div>
        <StatusBadge status={member.status} />
      </header>

      {!isSubPage && (
        <nav className="chip-scroll -mx-1 px-1">
          {mainTabs.map((tab) => (
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
            to={`${basePath}/inbody`}
            className={({ isActive }) =>
              `chip whitespace-nowrap ${isActive ? 'chip-active' : 'chip-inactive'}`
            }
          >
            인바디
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
