import { Navigate } from 'react-router-dom'
import { getAdminSession } from '../../lib/adminSession'
import { useBetaStart } from '../../contexts/BetaStartContext'
import TodayOpsPage from './TodayOpsPage'

export default function AdminHomePage() {
  const session = getAdminSession()
  const { complete, loading } = useBetaStart()

  if (session?.role === 'admin' && !loading && !complete) {
    return <Navigate to="/admin/beta-start" replace />
  }

  return <TodayOpsPage />
}
