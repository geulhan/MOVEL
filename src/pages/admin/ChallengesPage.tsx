import { Navigate } from 'react-router-dom'

export default function ChallengesPage() {
  return <Navigate to="/admin/motionhub?tab=challenges" replace />
}
