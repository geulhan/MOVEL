import { Outlet } from 'react-router-dom'
import { AdminAccessGuard } from './AdminAccessGuard'

export function ProtectedRoute() {
  return (
    <AdminAccessGuard>
      <Outlet />
    </AdminAccessGuard>
  )
}
