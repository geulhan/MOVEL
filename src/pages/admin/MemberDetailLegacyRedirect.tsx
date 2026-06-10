import { Navigate, useParams } from 'react-router-dom'

export default function MemberDetailLegacyRedirect() {
  const { memberId } = useParams<{ memberId: string }>()
  if (!memberId) return <Navigate to="/admin/members" replace />
  return <Navigate to={`/admin/member/${memberId}`} replace />
}
