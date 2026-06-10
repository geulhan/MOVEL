import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAdminAuthenticated } from '../lib/adminSession'

export function ProtectedRoute() {
  const location = useLocation()

  if (!isAdminAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
