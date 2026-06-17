import { Navigate } from 'react-router-dom'

export default function RewardsPageRedirect() {
  return <Navigate to="/admin/motionhub?tab=mileage" replace />
}
