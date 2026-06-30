import { Navigate } from 'react-router-dom'
import { getAdminSession } from '../../lib/adminSession'
import { useBetaStart } from '../../contexts/BetaStartContext'
import DashboardPage from './DashboardPage'

export default function AdminHomePage() {
  const session = getAdminSession()
  const { complete, loading } = useBetaStart()

  if (session?.role === 'trainer') {
    return <Navigate to="/admin/members" replace />
  }

  if (!loading && !complete) {
    return <Navigate to="/admin/beta-start" replace />
  }

  return <DashboardPage />
}
