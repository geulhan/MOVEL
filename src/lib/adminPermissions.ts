import { getAdminSession, type AdminRole, type AdminSession } from './adminSession'

export type { AdminRole }

export type AdminNavItem = {
  to: string
  end: boolean
  label: string
  icon: string
  roles: AdminRole[]
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin', end: true, label: '대시보드', icon: '◈', roles: ['admin'] },
  { to: '/admin/members', end: false, label: '회원 관리', icon: '◎', roles: ['admin', 'trainer'] },
  { to: '/admin/schedule', end: false, label: 'PT 스케줄', icon: '▦', roles: ['admin', 'trainer'] },
  { to: '/admin/attendance', end: false, label: '출석부', icon: '✓', roles: ['admin'] },
  { to: '/admin/trainers', end: false, label: '트레이너', icon: '★', roles: ['admin'] },
  { to: '/admin/rewards', end: false, label: '마일리지 관리', icon: '◆', roles: ['admin'] },
  { to: '/admin/payments', end: false, label: '결제 관리', icon: '₩', roles: ['admin'] },
  { to: '/admin/messages', end: false, label: '메시지 발송', icon: '✉', roles: ['admin'] },
]

const TRAINER_ALLOWED_PREFIXES = [
  '/admin/members',
  '/admin/member/',
  '/admin/schedule',
]

export function isFullAdmin(session: AdminSession | null = getAdminSession()): boolean {
  return session?.role === 'admin'
}

export function isTrainerStaff(session: AdminSession | null = getAdminSession()): boolean {
  return session?.role === 'trainer'
}

export function getDefaultAdminPath(session: AdminSession | null = getAdminSession()): string {
  if (session?.role === 'trainer') return '/admin/members'
  return '/admin'
}

export function canAccessAdminPath(
  pathname: string,
  session: AdminSession | null = getAdminSession(),
): boolean {
  if (!session) return false
  if (session.role === 'admin') return true

  if (pathname === '/admin' || pathname === '/admin/') return false

  return TRAINER_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  )
}

export function canAccessMemberDetailPath(
  pathname: string,
  session: AdminSession | null = getAdminSession(),
): boolean {
  if (!session) return false
  if (session.role === 'admin') return true
  if (pathname.endsWith('/pt')) return false
  return true
}

export function getMemberDetailTabs(session: AdminSession | null = getAdminSession()) {
  const tabs = [
    { to: '', end: true, label: '개요' },
    { to: 'attendance', end: false, label: '출석' },
    { to: 'records', end: false, label: '메모·상담' },
  ] as const

  if (isFullAdmin(session)) {
    return [
      { to: '', end: true, label: '개요' },
      { to: 'pt', end: false, label: 'PT·결제' },
      { to: 'attendance', end: false, label: '출석' },
      { to: 'records', end: false, label: '메모·상담' },
    ] as const
  }

  return tabs
}

export function navItemsForSession(session: AdminSession | null = getAdminSession()) {
  if (!session) return []
  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(session.role))
}
