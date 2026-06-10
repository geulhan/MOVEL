import { Navigate, useParams } from 'react-router-dom'

/** /member/:id → 관리자 회원 상세로 연결 */
export default function MemberAdminDetailRedirect() {
  const { memberId } = useParams<{ memberId: string }>()
  if (!memberId) return <Navigate to="/admin/members" replace />
  return <Navigate to={`/admin/member/${memberId}`} replace />
}
