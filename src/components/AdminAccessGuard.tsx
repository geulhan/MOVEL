import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import {
  canAccessAdminPath,
  canAccessMemberDetailPath,
  getDefaultAdminPath,
} from '../lib/adminPermissions'
import { getAdminSession, isAdminAuthenticated } from '../lib/adminSession'

type Props = {
  children: ReactNode
  adminOnly?: boolean
}

export function AdminAccessGuard({ children, adminOnly = false }: Props) {
  const location = useLocation()

  if (!isAdminAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const session = getAdminSession()

  if (adminOnly && session?.role === 'trainer') {
    return <Navigate to={getDefaultAdminPath(session)} replace />
  }

  if (!canAccessAdminPath(location.pathname, session)) {
    return <Navigate to={getDefaultAdminPath(session)} replace />
  }

  if (!canAccessMemberDetailPath(location.pathname, session)) {
    const memberBase = location.pathname.replace(/\/pt\/?$/, '')
    return <Navigate to={memberBase || getDefaultAdminPath(session)} replace />
  }

  return children
}
