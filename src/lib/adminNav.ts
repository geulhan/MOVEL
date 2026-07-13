import {
  isAnyFeatureEnabled,
  isClassFeatureEnabled,
  isFacilityFeatureEnabled,
  type CenterFeatureKey,
  type CenterFeatures,
} from '../types/centerFeatures'
import { getAdminSession, type AdminRole, type AdminSession } from './adminSession'

export type AdminNavChild = {
  to: string
  end?: boolean
  label: string
  roles?: AdminRole[]
  featureKeys?: CenterFeatureKey[]
  reservationsMenu?: boolean
}

export type AdminNavLink = {
  type: 'link'
  to: string
  end?: boolean
  label: string
  icon: string
  roles: AdminRole[]
  featureKeys?: CenterFeatureKey[]
  requireAllFeatures?: boolean
  reservationsMenu?: boolean
  classMenu?: boolean
  facilityMenu?: boolean
}

export type AdminNavGroup = {
  type: 'group'
  id: string
  label: string
  icon: string
  roles: AdminRole[]
  featureKeys?: CenterFeatureKey[]
  requireAllFeatures?: boolean
  reservationsMenu?: boolean
  classMenu?: boolean
  facilityMenu?: boolean
  children: AdminNavChild[]
}

export type AdminNavEntry = AdminNavLink | AdminNavGroup

export const ADMIN_NAV_ENTRIES: AdminNavEntry[] = [
  {
    type: 'link',
    to: '/admin',
    end: true,
    label: 'Today Feed',
    icon: '☀',
    roles: ['admin', 'trainer'],
  },
  {
    type: 'group',
    id: 'insights',
    label: '경영',
    icon: '◈',
    roles: ['admin'],
    children: [{ to: '/admin/insights', label: '경영 인사이트' }],
  },
  {
    type: 'group',
    id: 'members',
    label: '회원',
    icon: '◎',
    roles: ['admin', 'trainer'],
    featureKeys: ['membership'],
    children: [
      { to: '/admin/members', end: true, label: '회원 목록' },
      { to: '/admin/members/register', label: '회원 등록', roles: ['admin'] },
      { to: '/admin/leads', label: '상담' },
    ],
  },
  {
    type: 'group',
    id: 'operations',
    label: '운영',
    icon: '▦',
    roles: ['admin', 'trainer'],
    children: [
      { to: '/admin/reservations', label: '예약', reservationsMenu: true },
      { to: '/admin/attendance', label: '출석', featureKeys: ['attendance'] },
    ],
  },
  {
    type: 'group',
    id: 'payments',
    label: '결제',
    icon: '₩',
    roles: ['admin'],
    featureKeys: ['membership'],
    children: [
      { to: '/admin/payments?tab=pricing', label: '요금·상품' },
      { to: '/admin/payments?tab=requests', label: '결제 요청' },
      { to: '/admin/payments?tab=contracts', label: '계약 관리' },
    ],
  },
  {
    type: 'group',
    id: 'automation',
    label: '자동화',
    icon: '✉',
    roles: ['admin'],
    featureKeys: ['notifications'],
    children: [{ to: '/admin/messages', label: '메시지 발송' }],
  },
  {
    type: 'group',
    id: 'ai',
    label: 'AI',
    icon: '◉',
    roles: ['admin'],
    children: [{ to: '/admin/analytics', label: 'AI 운영비서' }],
  },
  {
    type: 'group',
    id: 'trainers',
    label: '강사',
    icon: '★',
    roles: ['admin'],
    featureKeys: ['pt', 'class'],
    requireAllFeatures: false,
    children: [{ to: '/admin/trainers', label: '강사 관리' }],
  },
  {
    type: 'group',
    id: 'facility',
    label: '시설',
    icon: '▣',
    roles: ['admin'],
    facilityMenu: true,
    children: [{ to: '/admin/facility', label: '시설 운영' }],
  },
  {
    type: 'group',
    id: 'mileage',
    label: '마일리지',
    icon: 'M',
    roles: ['admin'],
    featureKeys: ['mileage'],
    children: [{ to: '/admin/motionhub', label: '마일리지·리워드' }],
  },
  {
    type: 'group',
    id: 'settings',
    label: '설정',
    icon: '⚙',
    roles: ['admin'],
    children: [{ to: '/admin/settings', label: '센터 설정' }],
  },
]

type NavVisibility = Pick<
  AdminNavLink,
  | 'featureKeys'
  | 'requireAllFeatures'
  | 'reservationsMenu'
  | 'classMenu'
  | 'facilityMenu'
>

function entryVisible(entry: NavVisibility, features: CenterFeatures): boolean {
  if (entry.reservationsMenu) {
    return features.pt || isClassFeatureEnabled(features)
  }
  if (entry.classMenu) return isClassFeatureEnabled(features)
  if (entry.facilityMenu) return isFacilityFeatureEnabled(features)
  if (!entry.featureKeys?.length) return true
  if (entry.requireAllFeatures) {
    return entry.featureKeys.every((key) => features[key])
  }
  return isAnyFeatureEnabled(features, entry.featureKeys)
}

function childVisible(child: AdminNavChild, features: CenterFeatures): boolean {
  if (child.reservationsMenu) {
    return features.pt || isClassFeatureEnabled(features)
  }
  if (!child.featureKeys?.length) return true
  return isAnyFeatureEnabled(features, child.featureKeys)
}

export function navEntriesForSession(
  session: AdminSession | null = getAdminSession(),
  features?: CenterFeatures,
): AdminNavEntry[] {
  if (!session) return []

  const roleFiltered = ADMIN_NAV_ENTRIES.filter((entry) =>
    entry.roles.includes(session.role),
  )

  if (!features) return roleFiltered

  return roleFiltered
    .map((entry) => {
      if (!entryVisible(entry, features)) return null

      if (entry.type === 'link') return entry

      const children = entry.children.filter(
        (child) =>
          (!child.roles || child.roles.includes(session.role)) &&
          childVisible(child, features),
      )
      if (children.length === 0) return null
      return { ...entry, children }
    })
    .filter((entry): entry is AdminNavEntry => entry !== null)
}

export function flattenNavForMobile(entries: AdminNavEntry[]): Array<{
  to: string
  end?: boolean
  label: string
}> {
  const items: Array<{ to: string; end?: boolean; label: string }> = []

  for (const entry of entries) {
    if (entry.type === 'link') {
      items.push({ to: entry.to, end: entry.end, label: entry.label })
      continue
    }
    if (entry.children.length === 1) {
      const only = entry.children[0]
      items.push({
        to: only.to,
        end: only.end,
        label: only.label,
      })
      continue
    }
    for (const child of entry.children) {
      items.push({
        to: child.to,
        end: child.end,
        label: `${entry.label} · ${child.label}`,
      })
    }
  }

  return items
}

export function isNavPathActive(pathname: string, search: string, target: string): boolean {
  const [targetPath, targetQuery] = target.split('?')

  if (targetQuery) {
    if (pathname !== targetPath) return false
    const params = new URLSearchParams(targetQuery)
    const current = new URLSearchParams(search)
    for (const [key, value] of params.entries()) {
      if (key === 'tab' && value === 'pricing' && !current.get('tab')) {
        continue
      }
      if (current.get(key) !== value) return false
    }
    return true
  }

  if (targetPath === '/admin') {
    return pathname === '/admin' || pathname === '/admin/'
  }
  if (targetPath === '/admin/members') {
    return pathname === '/admin/members'
  }
  if (targetPath === '/admin/members/register') {
    return pathname === '/admin/members/register'
  }

  return pathname === targetPath || pathname.startsWith(`${targetPath}/`)
}

export function isNavGroupActive(
  pathname: string,
  search: string,
  group: AdminNavGroup,
): boolean {
  if (group.id === 'members' && pathname.startsWith('/admin/member/')) {
    return true
  }
  return group.children.some((child) => isNavPathActive(pathname, search, child.to))
}
