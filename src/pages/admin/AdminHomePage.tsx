import { Navigate } from 'react-router-dom'
import { getAdminSession } from '../../lib/adminSession'
import DashboardPage from './DashboardPage'

export default function AdminHomePage() {
  const session = getAdminSession()
  if (session?.role === 'trainer') {
    return <Navigate to="/admin/members" replace />
  }
  return <DashboardPage />
}
