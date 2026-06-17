import { getAdminSession, type AdminRole, type AdminSession } from './adminSession'
import {
  isAnyFeatureEnabled,
  isClassFeatureEnabled,
  isFacilityFeatureEnabled,
  type CenterFeatureKey,
  type CenterFeatures,
} from '../types/centerFeatures'

export type { AdminRole }

export type AdminNavItem = {
  to: string
  end: boolean
  label: string
  icon: string
  roles: AdminRole[]
  /** 비어 있으면 항상 표시 (관리자 전용 메뉴 등) */
  featureKeys?: CenterFeatureKey[]
  /** true면 featureKeys 전부 ON일 때만 표시 */
  requireAllFeatures?: boolean
  /** 클래스 메뉴 전용 */
  classMenu?: boolean
  /** 시설 메뉴 전용 */
  facilityMenu?: boolean
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin', end: true, label: '대시보드', icon: '◈', roles: ['admin'] },
  {
    to: '/admin/members',
    end: false,
    label: '회원 관리',
    icon: '◎',
    roles: ['admin', 'trainer'],
    featureKeys: ['membership'],
  },
  {
    to: '/admin/schedule',
    end: false,
    label: 'PT 스케줄',
    icon: '▦',
    roles: ['admin', 'trainer'],
    featureKeys: ['pt'],
  },
  {
    to: '/admin/classes',
    end: false,
    label: '클래스',
    icon: '◇',
    roles: ['admin', 'trainer'],
    classMenu: true,
  },
  {
    to: '/admin/attendance',
    end: false,
    label: '출석부',
    icon: '✓',
    roles: ['admin', 'trainer'],
    featureKeys: ['attendance'],
  },
  {
    to: '/admin/trainers',
    end: false,
    label: '트레이너',
    icon: '★',
    roles: ['admin'],
    featureKeys: ['pt', 'class'],
  },
  {
    to: '/admin/facility',
    end: false,
    label: '시설 운영',
    icon: '▣',
    roles: ['admin'],
    facilityMenu: true,
  },
  {
    to: '/admin/rewards',
    end: false,
    label: '마일리지 관리',
    icon: '◆',
    roles: ['admin'],
    featureKeys: ['mileage'],
  },
  {
    to: '/admin/challenges',
    end: false,
    label: '센터 챌린지',
    icon: '🎯',
    roles: ['admin'],
    featureKeys: ['mileage'],
  },
  {
    to: '/admin/season-pass',
    end: false,
    label: '시즌 패스',
    icon: '🌤',
    roles: ['admin'],
    featureKeys: ['mileage'],
  },
  {
    to: '/admin/payments',
    end: false,
    label: '결제 관리',
    icon: '₩',
    roles: ['admin'],
    featureKeys: ['membership'],
  },
  {
    to: '/admin/analytics',
    end: false,
    label: '경영분석',
    icon: '◉',
    roles: ['admin'],
  },
  {
    to: '/admin/messages',
    end: false,
    label: '메시지 발송',
    icon: '✉',
    roles: ['admin'],
    featureKeys: ['notifications'],
  },
  { to: '/admin/settings', end: false, label: '센터 설정', icon: '⚙', roles: ['admin'] },
]

const TRAINER_ALLOWED_PREFIXES = [
  '/admin/members',
  '/admin/member/',
  '/admin/schedule',
  '/admin/attendance',
  '/admin/classes',
]

const PATH_FEATURE_RULES: Array<{
  prefix: string
  check: (features: CenterFeatures) => boolean
}> = [
  { prefix: '/admin/schedule', check: (f) => f.pt },
  { prefix: '/admin/classes', check: isClassFeatureEnabled },
  { prefix: '/admin/attendance', check: (f) => f.attendance },
  { prefix: '/admin/trainers', check: (f) => f.pt || isClassFeatureEnabled(f) },
  { prefix: '/admin/facility', check: isFacilityFeatureEnabled },
  { prefix: '/admin/rewards', check: (f) => f.mileage },
  { prefix: '/admin/challenges', check: (f) => f.mileage },
  { prefix: '/admin/season-pass', check: (f) => f.mileage },
  { prefix: '/admin/messages', check: (f) => f.notifications },
  { prefix: '/admin/payments', check: (f) => f.membership },
  { prefix: '/admin/members', check: (f) => f.membership },
  { prefix: '/admin/member/', check: (f) => f.membership },
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

function navItemVisible(item: AdminNavItem, features: CenterFeatures): boolean {
  if (item.classMenu) return isClassFeatureEnabled(features)
  if (item.facilityMenu) return isFacilityFeatureEnabled(features)
  if (!item.featureKeys?.length) return true
  if (item.requireAllFeatures) {
    return item.featureKeys.every((key) => features[key])
  }
  return isAnyFeatureEnabled(features, item.featureKeys)
}

export function navItemsForSession(
  session: AdminSession | null = getAdminSession(),
  features?: CenterFeatures,
) {
  if (!session) return []
  const roleItems = ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(session.role))
  if (!features) return roleItems
  return roleItems.filter((item) => navItemVisible(item, features))
}

export function canAccessAdminPath(
  pathname: string,
  session: AdminSession | null = getAdminSession(),
  features?: CenterFeatures,
): boolean {
  if (!session) return false
  if (session.role === 'admin') {
    if (!features) return true
    for (const rule of PATH_FEATURE_RULES) {
      if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
        return rule.check(features)
      }
    }
    return true
  }

  if (pathname === '/admin' || pathname === '/admin/') return false

  if (!TRAINER_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  )) {
    return false
  }

  if (!features) return true

  for (const rule of PATH_FEATURE_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.check(features)
    }
  }

  return true
}

export function canAccessMemberDetailPath(
  pathname: string,
  session: AdminSession | null = getAdminSession(),
  features?: CenterFeatures,
): boolean {
  if (!session) return false
  if (session.role === 'admin') return true
  if (pathname.endsWith('/pt') && features && !features.pt) return false
  if (pathname.endsWith('/pt')) return false
  if (pathname.endsWith('/journal') && features && !features.exercise_log) return false
  return true
}

export function getMemberDetailTabs(
  session: AdminSession | null = getAdminSession(),
  features?: CenterFeatures,
) {
  if (isFullAdmin(session)) {
    const adminTabs = [
      { to: '', end: true, label: '개요' },
    ] as Array<{ to: string; end: boolean; label: string }>

    if (!features || features.pt) {
      adminTabs.push({ to: 'pt', end: false, label: 'PT·결제' })
    }
    if (!features || features.attendance) {
      adminTabs.push({ to: 'attendance', end: false, label: '출석' })
    }
    adminTabs.push({ to: 'records', end: false, label: '메모·상담' })
    if (!features || features.exercise_log) {
      adminTabs.push({ to: 'journal', end: false, label: '운동일지' })
    }
    return adminTabs
  }

  const trainerTabs = [
    { to: '', end: true, label: '개요' },
  ] as Array<{ to: string; end: boolean; label: string }>
  if (!features || features.attendance) {
    trainerTabs.push({ to: 'attendance', end: false, label: '출석' })
  }
  trainerTabs.push({ to: 'records', end: false, label: '메모·상담' })
  return trainerTabs
}
