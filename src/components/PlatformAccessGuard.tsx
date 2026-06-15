import { Navigate, Outlet } from 'react-router-dom'
import {
  getPlatformSession,
  isPlatformAuthenticated,
} from '../lib/platformSession'

export function PlatformAccessGuard({ children }: { children?: React.ReactNode }) {
  if (!isPlatformAuthenticated()) {
    return <Navigate to="/platform/login" replace />
  }

  return children ?? <Outlet />
}

export function PlatformGuestOnly({ children }: { children: React.ReactNode }) {
  if (isPlatformAuthenticated()) {
    return <Navigate to="/platform" replace />
  }
  return children
}

export function getPlatformSessionOrNull() {
  return getPlatformSession()
}
